import Peer, { type DataConnection } from "peerjs";
import type { GameState, UnoColor } from "@/lib/uno-engine";

export const ROOM_PREFIX = "unobuddy-";

export type SyncMessage =
  | { type: "state"; game: GameState }
  | { type: "assign"; viewerIdx: number; players: { name: string; kind: "human" | "bot" }[] }
  | { type: "action"; action: PeerAction }
  | { type: "hello"; name: string }
  | { type: "kicked" };

export type PeerAction =
  | { kind: "play"; cardId: string; color?: UnoColor }
  | { kind: "draw" }
  | { kind: "endTurn" }
  | { kind: "swap"; targetIdx: number };

export interface PeerSlot {
  connId: string;
  name: string;
}

export function makeRoomCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// ---------------------------------------------------------------------------
// Local IP discovery via WebRTC — works 100% offline on LAN / hotspot.
// ---------------------------------------------------------------------------
export async function getLocalIPs(): Promise<string[]> {
  const ips: string[] = [];
  try {
    const pc = new RTCPeerConnection({ iceServers: [] });
    pc.createDataChannel("");
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => { pc.close(); resolve(); }, 2500);
      pc.onicecandidate = (e) => {
        if (!e.candidate) { clearTimeout(timer); pc.close(); resolve(); return; }
        // e.g. "candidate:... IP ..."
        const parts = e.candidate.candidate.split(" ");
        const ip = parts[4];
        if (ip && !ip.includes(":") && !ips.includes(ip)) {
          ips.push(ip);
        }
      };
    });
  } catch {
    /* silently ignore — device may not support WebRTC candidate enumeration */
  }
  return ips.filter((ip) => ip !== "0.0.0.0");
}

// ---------------------------------------------------------------------------
// PeerJS server configs tried in order.
// ---------------------------------------------------------------------------
interface PeerServerConfig {
  host: string;
  port: number;
  path: string;
  secure: boolean;
}

const CLOUD_SERVERS: PeerServerConfig[] = [
  // Primary PeerJS cloud
  { host: "0.peerjs.com", port: 443, path: "/", secure: true },
  // Public fallback
  { host: "peer.pm", port: 443, path: "/uno", secure: true },
];

const CONNECTION_TIMEOUT_MS = 8_000;

function buildPeer(peerId: string | undefined, custom?: PeerServerConfig): Peer {
  const id = peerId ?? "";
  if (custom) {
    return new Peer(id, {
      host: custom.host,
      port: custom.port,
      path: custom.path,
      secure: custom.secure,
      debug: 0,
    });
  }
  // Default — let PeerJS pick its own cloud config
  return id ? new Peer(id) : new Peer();
}

/**
 * Attempts to open a Peer on the given config, resolving on "open",
 * rejecting after timeout or on a fatal error.
 */
function openPeer(peerId: string | undefined, config?: PeerServerConfig): Promise<Peer> {
  return new Promise((resolve, reject) => {
    const peer = buildPeer(peerId, config);
    const timer = setTimeout(() => {
      peer.destroy();
      reject(new Error("timeout"));
    }, CONNECTION_TIMEOUT_MS);

    peer.on("open", () => {
      clearTimeout(timer);
      resolve(peer);
    });
    peer.on("error", (err) => {
      clearTimeout(timer);
      // "unavailable-id" means the room code is taken — propagate immediately.
      if ((err as any).type === "unavailable-id") {
        peer.destroy();
        reject(err);
        return;
      }
      peer.destroy();
      reject(new Error("server-error"));
    });
  });
}

/**
 * Try each cloud server in turn; if all fail, try without a server config
 * (PeerJS will use its bundled default which may differ from the list).
 * If that also fails, reject with a user-facing message.
 */
async function connectWithFallback(peerId?: string): Promise<Peer> {
  const attempts: Array<PeerServerConfig | undefined> = [...CLOUD_SERVERS, undefined];

  for (const cfg of attempts) {
    try {
      return await openPeer(peerId, cfg);
    } catch (err) {
      // Don't retry on "room taken" — surface immediately.
      if ((err as Error).message !== "timeout" && (err as Error).message !== "server-error") {
        throw err;
      }
    }
  }

  throw new Error(
    "Could not reach any relay server. " +
    "Make sure both devices share the same Wi-Fi or hotspot, then try again."
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface HostHandle {
  peer: Peer;
  code: string;
  onJoin: (cb: (info: PeerSlot) => void) => void;
  onLeave: (cb: (connId: string) => void) => void;
  onMessage: (cb: (connId: string, msg: SyncMessage) => void) => void;
  broadcast: (msg: SyncMessage) => void;
  sendTo: (connId: string, msg: SyncMessage) => void;
  kick: (connId: string) => void;
  destroy: () => void;
}

export interface JoinHandle {
  peer: Peer;
  conn: DataConnection;
  send: (msg: SyncMessage) => void;
  onMessage: (cb: (msg: SyncMessage) => void) => void;
  onClose: (cb: () => void) => void;
  destroy: () => void;
}

export async function createHost(code: string): Promise<HostHandle> {
  const peer = await connectWithFallback(ROOM_PREFIX + code);

  const conns = new Map<string, DataConnection>();
  let joinCb: ((info: PeerSlot) => void) | null = null;
  let leaveCb: ((connId: string) => void) | null = null;
  let msgCb: ((connId: string, msg: SyncMessage) => void) | null = null;

  peer.on("connection", (conn) => {
    const id = conn.peer;
    conns.set(id, conn);
    conn.on("data", (data) => {
      const msg = data as SyncMessage;
      if (msg.type === "hello") {
        joinCb?.({ connId: id, name: msg.name });
      } else {
        msgCb?.(id, msg);
      }
    });
    conn.on("close", () => {
      if (conns.has(id)) {
        conns.delete(id);
        leaveCb?.(id);
      }
    });
  });

  return {
    peer,
    code,
    onJoin: (cb) => (joinCb = cb),
    onLeave: (cb) => (leaveCb = cb),
    onMessage: (cb) => (msgCb = cb),
    broadcast: (msg) => {
      for (const c of conns.values()) {
        if (c.open) c.send(msg);
      }
    },
    sendTo: (connId, msg) => {
      const c = conns.get(connId);
      if (c?.open) c.send(msg);
    },
    kick: (connId) => {
      const c = conns.get(connId);
      if (c) {
        try { c.send({ type: "kicked" }); } catch { /* ignore */ }
        setTimeout(() => c.close(), 80);
        conns.delete(connId);
        leaveCb?.(connId);
      }
    },
    destroy: () => {
      conns.forEach((c) => c.close());
      peer.destroy();
    },
  };
}

export async function joinHost(code: string, name: string): Promise<JoinHandle> {
  const peer = await connectWithFallback();

  return new Promise((resolve, reject) => {
    const conn = peer.connect(ROOM_PREFIX + code, { reliable: true });
    let resolved = false;
    let msgCb: ((msg: SyncMessage) => void) | null = null;
    let closeCb: (() => void) | null = null;

    const timeout = setTimeout(() => {
      if (!resolved) {
        peer.destroy();
        reject(new Error("peer-unavailable"));
      }
    }, CONNECTION_TIMEOUT_MS);

    conn.on("open", () => {
      clearTimeout(timeout);
      conn.send({ type: "hello", name });
      resolved = true;
      resolve({
        peer,
        conn,
        send: (msg) => { if (conn.open) conn.send(msg); },
        onMessage: (cb) => (msgCb = cb),
        onClose: (cb) => (closeCb = cb),
        destroy: () => { conn.close(); peer.destroy(); },
      });
    });
    conn.on("data", (data) => msgCb?.(data as SyncMessage));
    conn.on("close", () => closeCb?.());
    conn.on("error", (err) => {
      clearTimeout(timeout);
      if (!resolved) { peer.destroy(); reject(err); }
    });
  });
}
