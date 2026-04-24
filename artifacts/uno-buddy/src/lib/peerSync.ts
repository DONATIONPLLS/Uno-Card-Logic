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

export function createHost(code: string): Promise<HostHandle> {
  return new Promise((resolve, reject) => {
    const peer = new Peer(ROOM_PREFIX + code);
    const conns = new Map<string, DataConnection>();
    let joinCb: ((info: PeerSlot) => void) | null = null;
    let leaveCb: ((connId: string) => void) | null = null;
    let msgCb: ((connId: string, msg: SyncMessage) => void) | null = null;

    peer.on("error", (err) => reject(err));
    peer.on("open", () => {
      resolve({
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
            try { c.send({ type: "kicked" }); } catch {}
            setTimeout(() => c.close(), 80);
            conns.delete(connId);
            leaveCb?.(connId);
          }
        },
        destroy: () => {
          conns.forEach((c) => c.close());
          peer.destroy();
        },
      });
    });
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
  });
}

export function joinHost(code: string, name: string): Promise<JoinHandle> {
  return new Promise((resolve, reject) => {
    const peer = new Peer();
    let msgCb: ((msg: SyncMessage) => void) | null = null;
    let closeCb: (() => void) | null = null;
    peer.on("error", (err) => reject(err));
    peer.on("open", () => {
      const conn = peer.connect(ROOM_PREFIX + code, { reliable: true });
      let resolved = false;
      conn.on("open", () => {
        conn.send({ type: "hello", name });
        resolved = true;
        resolve({
          peer,
          conn,
          send: (msg) => conn.open && conn.send(msg),
          onMessage: (cb) => (msgCb = cb),
          onClose: (cb) => (closeCb = cb),
          destroy: () => {
            conn.close();
            peer.destroy();
          },
        });
      });
      conn.on("data", (data) => msgCb?.(data as SyncMessage));
      conn.on("close", () => closeCb?.());
      conn.on("error", (err) => {
        if (!resolved) reject(err);
      });
    });
  });
}
