import Peer, { type DataConnection } from "peerjs";
import type { GameState, UnoColor } from "@/lib/uno-engine";

export const ROOM_PREFIX = "unobuddy-";

export type SyncMessage =
  | { type: "state"; game: GameState }
  | { type: "action"; action: PeerAction }
  | { type: "hello"; name: string };

export type PeerAction =
  | { kind: "play"; cardId: string; color?: UnoColor }
  | { kind: "draw" }
  | { kind: "endTurn" }
  | { kind: "swap"; targetIdx: number };

export function makeRoomCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export interface HostHandle {
  peer: Peer;
  code: string;
  onJoin: (cb: (conn: DataConnection, name: string) => void) => void;
  broadcast: (msg: SyncMessage) => void;
  onMessage: (cb: (msg: SyncMessage) => void) => void;
  destroy: () => void;
}

export interface JoinHandle {
  peer: Peer;
  conn: DataConnection;
  send: (msg: SyncMessage) => void;
  onMessage: (cb: (msg: SyncMessage) => void) => void;
  destroy: () => void;
}

export function createHost(code: string): Promise<HostHandle> {
  return new Promise((resolve, reject) => {
    const peer = new Peer(ROOM_PREFIX + code);
    let conns: DataConnection[] = [];
    let joinCb: ((conn: DataConnection, name: string) => void) | null = null;
    let msgCb: ((msg: SyncMessage) => void) | null = null;
    peer.on("error", (err) => reject(err));
    peer.on("open", () => {
      resolve({
        peer,
        code,
        onJoin: (cb) => (joinCb = cb),
        onMessage: (cb) => (msgCb = cb),
        broadcast: (msg) => conns.forEach((c) => c.open && c.send(msg)),
        destroy: () => {
          conns.forEach((c) => c.close());
          peer.destroy();
        },
      });
    });
    peer.on("connection", (conn) => {
      conns.push(conn);
      conn.on("data", (data) => {
        const msg = data as SyncMessage;
        if (msg.type === "hello") joinCb?.(conn, msg.name);
        else msgCb?.(msg);
      });
      conn.on("close", () => {
        conns = conns.filter((c) => c !== conn);
      });
    });
  });
}

export function joinHost(code: string, name: string): Promise<JoinHandle> {
  return new Promise((resolve, reject) => {
    const peer = new Peer();
    let msgCb: ((msg: SyncMessage) => void) | null = null;
    peer.on("error", (err) => reject(err));
    peer.on("open", () => {
      const conn = peer.connect(ROOM_PREFIX + code, { reliable: true });
      conn.on("open", () => {
        conn.send({ type: "hello", name });
        resolve({
          peer,
          conn,
          send: (msg) => conn.open && conn.send(msg),
          onMessage: (cb) => (msgCb = cb),
          destroy: () => {
            conn.close();
            peer.destroy();
          },
        });
      });
      conn.on("data", (data) => msgCb?.(data as SyncMessage));
      conn.on("error", (err) => reject(err));
    });
  });
}
