import { Server } from "partyserver";
import { isCorrect, matchesAnyArtist } from "../src/match.js";
import {
  MAX_GUESSES,
  ROUND_COUNT,
  PLAYER_COLORS,
  shuffle,
  normalizeAvatar,
  randomAvatar,
  titlePointsForGuess,
  ARTIST_BONUS,
} from "../src/multiplayer/constants.js";
import { resolveItunesPreview } from "./itunesPreview.js";

/** Soft-offline (grey) until this long, then marked left (strikethrough). */
const LEAVE_AFTER_MS = 45 * 60 * 1000;
/** Keep empty rooms around so friends can still rejoin after a long tab-away. */
const ROOM_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Multiplayer room (PartyServer / Cloudflare Durable Object).
 * Shared race state; unlock/skip is per-player. Each client plays iTunes previews locally (no DJ).
 */
export class Room extends Server {
  state = null; // set when host claims the room

  async onStart() {
    const saved = await this.ctx.storage.get("room");
    if (saved) {
      this.state = saved;
      // Connections are gone after hibernation — wait for rejoin/host reclaim.
      this.state.hostConnId = null;
      this.state.hostConnected = false;
      for (const p of this.state.players || []) {
        p.connId = null;
        p.connected = false;
        if (!p.left && !p.disconnectedAt) p.disconnectedAt = Date.now();
        // Ensure every player has a peep (migrate legacy eyes/mouth avatars once).
        p.avatar = normalizeAvatar(p.avatar, p.color || PLAYER_COLORS[0]);
        p.color = p.avatar.color;
      }
      await this.scheduleLeaveAlarm();
    }
  }

  onConnect(conn) {
    // Wait for hello / join before treating as a player.
    conn.send(JSON.stringify({ type: "hello", room: this.name }));
  }

  async onClose(conn) {
    if (!this.state) return;
    const now = Date.now();
    if (this.state.hostConnId === conn.id) {
      this.state.hostConnId = null;
      this.state.hostConnected = false;
      const hostPlayer = this.state.players.find((x) => x.isHost);
      if (hostPlayer) {
        hostPlayer.connected = false;
        hostPlayer.connId = null;
        hostPlayer.disconnectedAt = now;
      }
      this.broadcastState();
      await this.persist();
      await this.scheduleLeaveAlarm();
      return;
    }
    const p = this.state.players.find((x) => x.connId === conn.id);
    if (p) {
      p.connected = false;
      p.connId = null;
      p.disconnectedAt = now;
      this.broadcastState();
      await this.persist();
      await this.scheduleLeaveAlarm();
    }
  }

  async alarm() {
    if (!this.state) return;
    const now = Date.now();
    let changed = false;
    for (const p of this.state.players) {
      if (
        !p.connected &&
        !p.left &&
        p.disconnectedAt &&
        now - p.disconnectedAt >= LEAVE_AFTER_MS
      ) {
        p.left = true;
        changed = true;
      }
    }
    if (changed) {
      this.broadcastState();
      await this.persist();
    }

    const anyoneOnline = this.state.players.some((p) => p.connected);
    const lastActivity = Math.max(
      0,
      ...this.state.players.map((p) => p.disconnectedAt || 0),
      this.state.updatedAt || 0
    );
    if (!anyoneOnline && lastActivity && now - lastActivity >= ROOM_TTL_MS) {
      this.state = null;
      await this.ctx.storage.delete("room");
      return;
    }

    await this.scheduleLeaveAlarm();
  }

  async scheduleLeaveAlarm() {
    if (!this.state) return;
    const now = Date.now();
    const deadlines = [];
    for (const p of this.state.players) {
      if (!p.connected && !p.left && p.disconnectedAt) {
        deadlines.push(p.disconnectedAt + LEAVE_AFTER_MS);
      }
    }
    const anyoneOnline = this.state.players.some((p) => p.connected);
    if (!anyoneOnline) {
      const lastActivity = Math.max(
        0,
        ...this.state.players.map((p) => p.disconnectedAt || 0),
        this.state.updatedAt || now
      );
      deadlines.push(lastActivity + ROOM_TTL_MS);
    }
    if (!deadlines.length) return;
    const next = Math.min(...deadlines);
    await this.ctx.storage.setAlarm(Math.max(next, now + 1000));
  }

  async persist() {
    if (!this.state) {
      await this.ctx.storage.delete("room");
      return;
    }
    this.state.updatedAt = Date.now();
    await this.ctx.storage.put("room", this.state);
  }

  async onMessage(sender, message) {
    let msg;
    try {
      msg = JSON.parse(message);
    } catch {
      return;
    }

    switch (msg.type) {
      case "host":
        this.handleHost(msg, sender);
        break;
      case "join":
        this.handleJoin(msg, sender);
        break;
      case "start":
        await this.handleStart(sender);
        break;
      case "guess":
        this.handleGuess(msg, sender);
        break;
      case "skip":
        this.handleSkip(sender);
        break;
      case "next":
        await this.handleNext(sender);
        break;
      case "rejoin":
        this.handleRejoin(msg, sender);
        break;
      case "profile":
        this.handleProfile(msg, sender);
        break;
      case "setPreview":
        this.handleSetPreview(msg, sender);
        break;
      default:
        break;
    }
  }

  /** Host (or any player) can publish a resolved preview URL for the current round. */
  handleSetPreview(msg, sender) {
    if (!this.state) return;
    if (!this.playerFor(sender)) return;
    const trackId = this.state.tracks[this.state.roundIdx]?.id;
    if (!trackId) return;
    if (msg.trackId && msg.trackId !== trackId) return;
    const url = String(msg.previewUrl || "").trim();
    if (!url || !/^https?:\/\//i.test(url)) return;
    if (this.state.previewUrl === url) return;
    this.state.previewUrl = url;
    if (msg.previewArt) this.state.previewArt = String(msg.previewArt);
    this.broadcastState();
    void this.persist();
  }

  handleHost(msg, sender) {
    const tracks = Array.isArray(msg.tracks) ? msg.tracks : [];
    if (tracks.length < 2) {
      sender.send(JSON.stringify({ type: "error", error: "Need at least 2 tracks." }));
      return;
    }

    // First host claim wins; reconnecting host can reclaim if same room empty host.
    if (this.state?.hostConnId && this.state.hostConnId !== sender.id && this.state.hostConnected) {
      sender.send(JSON.stringify({ type: "error", error: "This room already has a host." }));
      return;
    }

    if (!this.state) {
      const hostName = String(msg.hostName || "host").trim().split(/\s+/)[0].slice(0, 16) || "host";
      const avatar = normalizeAvatar(msg.avatar || randomAvatar(), PLAYER_COLORS[0]);
      const hostPlayer = {
        id: crypto.randomUUID(),
        connId: sender.id,
        name: hostName,
        color: avatar.color,
        avatar,
        score: 0,
        wins: 0,
        connected: true,
        left: false,
        disconnectedAt: null,
        isHost: true,
      };
      this.state = {
        hostConnId: sender.id,
        hostConnected: true,
        hostName,
        playlistName: msg.playlistName || "playlist",
        tracks: shuffle(tracks).slice(0, Math.min(ROUND_COUNT, tracks.length)),
        players: [hostPlayer],
        phase: "lobby", // lobby | play | reveal | over
        roundIdx: 0,
        unlockByPlayer: {},
        guesses: [],
        outcome: null,
        winnerId: null,
        bonus: 0,
        earnedPts: 0,
        previewUrl: null,
        previewArt: null,
        revealedArtist: null,
        artistClaimedBy: null,
        colorIdx: 1,
        updatedAt: Date.now(),
      };
      sender.send(
        JSON.stringify({ type: "hosted", role: "host", playerId: hostPlayer.id })
      );
      this.broadcastState();
      void this.persist();
      return;
    }

    this.state.hostConnId = sender.id;
    this.state.hostConnected = true;
    this.state.hostName = msg.hostName || this.state.hostName;
    let hostPlayer = this.state.players.find((p) => p.isHost);
    if (!hostPlayer) {
      const avatar = normalizeAvatar(msg.avatar || randomAvatar(), PLAYER_COLORS[0]);
      hostPlayer = {
        id: crypto.randomUUID(),
        connId: sender.id,
        name: String(this.state.hostName).split(/\s+/)[0].slice(0, 16) || "host",
        color: avatar.color,
        avatar,
        score: 0,
        wins: 0,
        connected: true,
        left: false,
        disconnectedAt: null,
        isHost: true,
      };
      this.state.players.unshift(hostPlayer);
    } else {
      hostPlayer.connId = sender.id;
      hostPlayer.connected = true;
      hostPlayer.left = false;
      hostPlayer.disconnectedAt = null;
      if (msg.avatar) {
        hostPlayer.avatar = normalizeAvatar(msg.avatar, hostPlayer.color);
        hostPlayer.color = hostPlayer.avatar.color;
      }
    }
    if (msg.tracks?.length) {
      // Only replace tracks while still in lobby.
      if (this.state.phase === "lobby") {
        this.state.tracks = shuffle(msg.tracks).slice(
          0,
          Math.min(ROUND_COUNT, msg.tracks.length)
        );
        this.state.playlistName = msg.playlistName || this.state.playlistName;
      }
    }

    sender.send(
      JSON.stringify({ type: "hosted", role: "host", playerId: hostPlayer.id })
    );
    this.broadcastState();
    void this.persist();
  }

  handleJoin(msg, sender) {
    if (!this.state) {
      sender.send(JSON.stringify({ type: "error", error: "Room not ready yet — wait for the host." }));
      return;
    }
    if (this.state.phase === "over") {
      sender.send(JSON.stringify({ type: "error", error: "This party is over." }));
      return;
    }

    const name = String(msg.name || "").trim().slice(0, 16);
    if (!name) {
      sender.send(JSON.stringify({ type: "error", error: "Enter a nickname." }));
      return;
    }

    // Prevent duplicate names (case-insensitive).
    if (this.state.players.some((p) => p.name.toLowerCase() === name.toLowerCase() && p.connected)) {
      sender.send(JSON.stringify({ type: "error", error: "That name is taken." }));
      return;
    }

    const fallback = PLAYER_COLORS[this.state.colorIdx % PLAYER_COLORS.length];
    this.state.colorIdx += 1;
    const avatar = normalizeAvatar(msg.avatar || randomAvatar(), fallback);
    const player = {
      id: crypto.randomUUID(),
      connId: sender.id,
      name,
      color: avatar.color,
      avatar,
      score: 0,
      wins: 0,
      connected: true,
      left: false,
      disconnectedAt: null,
    };
    this.state.players.push(player);

    sender.send(JSON.stringify({ type: "joined", role: "guest", playerId: player.id }));
    this.broadcastState();
    void this.persist();
  }

  handleProfile(msg, sender) {
    if (!this.state || this.state.phase === "over") return;
    const player = this.playerFor(sender);
    if (!player) return;

    const name = String(msg.name || player.name).trim().slice(0, 16);
    if (!name) {
      sender.send(JSON.stringify({ type: "error", error: "Enter a nickname." }));
      return;
    }
    if (
      this.state.players.some(
        (p) => p.id !== player.id && p.connected && p.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      sender.send(JSON.stringify({ type: "error", error: "That name is taken." }));
      return;
    }

    player.name = name;
    player.avatar = normalizeAvatar(msg.avatar || player.avatar, player.color);
    player.color = player.avatar.color;
    if (player.isHost) this.state.hostName = name;
    this.broadcastState();
    void this.persist();
  }

  handleRejoin(msg, sender) {
    if (!this.state) {
      sender.send(JSON.stringify({ type: "error", error: "Room expired." }));
      return;
    }
    const player = this.state.players.find((p) => p.id === msg.playerId);
    if (!player) {
      sender.send(JSON.stringify({ type: "error", error: "Player not found — join again." }));
      return;
    }
    player.connId = sender.id;
    player.connected = true;
    player.left = false;
    player.disconnectedAt = null;
    if (player.isHost) {
      this.state.hostConnId = sender.id;
      this.state.hostConnected = true;
    }
    sender.send(
      JSON.stringify({
        type: player.isHost ? "hosted" : "joined",
        role: player.isHost ? "host" : "guest",
        playerId: player.id,
      })
    );
    this.broadcastState();
    void this.persist();
  }

  async handleStart(sender) {
    if (!this.isHost(sender)) return;
    if (!this.state || this.state.phase !== "lobby") return;
    if (this.state.players.filter((p) => p.connected).length < 1) {
      sender.send(JSON.stringify({ type: "error", error: "Need at least one player." }));
      return;
    }
    this.state.phase = "play";
    this.state.roundIdx = 0;
    this.state.unlockByPlayer = {};
    this.state.guesses = [];
    this.state.outcome = null;
    this.state.winnerId = null;
    this.state.bonus = 0;
    this.state.earnedPts = 0;
    this.state.revealedArtist = null;
    this.state.artistClaimedBy = null;
    await this.resolveCurrentPreview();
    this.broadcastState();
    await this.persist();
  }

  handleGuess(msg, sender) {
    if (!this.state || this.state.phase !== "play") return;
    const player = this.playerFor(sender);
    if (!player) {
      sender.send(JSON.stringify({ type: "error", error: "Join the race first." }));
      return;
    }

    const title = String(msg.title || "").trim();
    let artist = String(msg.artist || "").trim();
    const artistLocked = !!this.state.revealedArtist;

    // Artist already claimed room-wide — only title guesses matter now.
    if (artistLocked) {
      artist = "";
      if (!title) return;
    }
    if (!title && !artist) return;

    const track = this.state.tracks[this.state.roundIdx];
    if (!track) return;

    const titleOk = title ? isCorrect(title, track.name) : false;
    const artistOk = !artistLocked && artist ? matchesAnyArtist(artist, track.artists) : false;
    const win = titleOk;

    // First correct artist fills it for the whole room (+bonus once).
    let artistPts = 0;
    if (artistOk && !this.state.artistClaimedBy) {
      this.state.artistClaimedBy = player.id;
      this.state.revealedArtist = (track.artists || []).join(", ");
      artistPts = ARTIST_BONUS;
      player.score += artistPts;
    }

    this.state.guesses.push({
      playerId: player.id,
      name: player.name,
      color: player.color,
      avatar: player.avatar,
      title: title || null,
      artist: artistOk ? this.state.revealedArtist : artist || null,
      titleOk,
      artistOk,
      win,
      artistPts,
    });

    if (win) {
      const step = this.state.unlockByPlayer?.[player.id] ?? 0;
      const titlePts = titlePointsForGuess(step);
      const earned = titlePts + artistPts;
      this.state.bonus = artistPts;
      this.state.earnedPts = earned;
      this.state.winnerId = player.id;
      this.state.outcome = "win";
      this.state.phase = "reveal";
      player.score += titlePts;
      player.wins += 1;
    } else if (artistPts) {
      this.state.bonus = artistPts;
      this.state.earnedPts = artistPts;
    }
    // Wrong guesses never unlock more audio — only that player's skip does.

    this.broadcastState();
    void this.persist();
  }

  handleSkip(sender) {
    if (!this.state || this.state.phase !== "play") return;
    const player = this.playerFor(sender);
    if (!player) {
      sender.send(JSON.stringify({ type: "error", error: "Join the race first." }));
      return;
    }

    if (!this.state.unlockByPlayer) this.state.unlockByPlayer = {};
    const step = this.state.unlockByPlayer[player.id] ?? 0;

    this.state.guesses.push({
      playerId: player.id,
      name: player.name,
      color: player.color,
      avatar: player.avatar,
      skip: true,
    });
    // Only this player's snippet grows — never shared, never ends the round.
    if (step < MAX_GUESSES - 1) {
      this.state.unlockByPlayer[player.id] = step + 1;
    }
    this.broadcastState();
    void this.persist();
  }

  async handleNext(sender) {
    if (!this.state || this.state.phase !== "reveal") return;
    if (!this.playerFor(sender)) {
      sender.send(JSON.stringify({ type: "error", error: "Join the race first." }));
      return;
    }

    if (this.state.roundIdx + 1 >= this.state.tracks.length) {
      this.state.phase = "over";
      this.state.previewUrl = null;
      this.state.previewArt = null;
      this.broadcastState();
      await this.persist();
      return;
    }

    this.state.roundIdx += 1;
    this.state.unlockByPlayer = {};
    this.state.guesses = [];
    this.state.outcome = null;
    this.state.winnerId = null;
    this.state.bonus = 0;
    this.state.earnedPts = 0;
    this.state.revealedArtist = null;
    this.state.artistClaimedBy = null;
    this.state.phase = "play";
    await this.resolveCurrentPreview();
    this.broadcastState();
    await this.persist();
  }

  async resolveCurrentPreview() {
    if (!this.state) return;
    const t = this.state.tracks[this.state.roundIdx];
    this.state.previewUrl = null;
    this.state.previewArt = null;
    if (!t?.name) return;
    // Prefer a preview the host already attached to the track payload.
    if (t.previewUrl) {
      this.state.previewUrl = t.previewUrl;
      this.state.previewArt = t.previewArt || null;
      return;
    }
    try {
      const pick = await resolveItunesPreview(t.name, (t.artists || [])[0] || "");
      if (pick) {
        this.state.previewUrl = pick.previewUrl;
        this.state.previewArt = pick.artworkUrl;
        t.previewUrl = pick.previewUrl;
        t.previewArt = pick.artworkUrl;
      }
    } catch (e) {
      console.error("preview resolve failed", e);
    }
  }

  isHost(conn) {
    return this.state && this.state.hostConnId === conn.id;
  }

  playerFor(conn) {
    return this.state?.players.find((p) => p.connId === conn.id) || null;
  }

  publicTrack() {
    const t = this.state.tracks[this.state.roundIdx];
    if (!t) return null;
    const previewUrl = this.state.previewUrl || t.previewUrl || null;
    const revealed = this.state.phase === "reveal" || this.state.phase === "over";
    if (revealed) {
      return {
        id: t.id,
        name: t.name,
        artists: t.artists,
        cover: t.cover || this.state.previewArt || t.previewArt || null,
        previewUrl,
      };
    }
    // Hide answer fields; expose preview so each device can play locally.
    return {
      id: t.id,
      cover: null,
      name: null,
      artists: null,
      previewUrl,
    };
  }

  snapshot() {
    if (!this.state) return { phase: "empty" };
    return {
      phase: this.state.phase,
      playlistName: this.state.playlistName,
      hostName: this.state.hostName,
      hostConnected: this.state.hostConnected,
      players: this.state.players.map((p) => {
        const avatar = normalizeAvatar(p.avatar, p.color);
        p.avatar = avatar;
        p.color = avatar.color;
        return {
          id: p.id,
          name: p.name,
          color: p.color,
          avatar,
          score: p.score,
          wins: p.wins,
          connected: p.connected,
          left: !!p.left,
          isHost: !!p.isHost,
        };
      }),
      roundIdx: this.state.roundIdx,
      roundCount: this.state.tracks.length,
      unlockByPlayer: { ...(this.state.unlockByPlayer || {}) },
      guesses: this.state.guesses,
      outcome: this.state.outcome,
      winnerId: this.state.winnerId,
      bonus: this.state.bonus,
      earnedPts: this.state.earnedPts,
      revealedArtist: this.state.revealedArtist || null,
      artistClaimedBy: this.state.artistClaimedBy || null,
      track: this.publicTrack(),
      trackId: this.state.tracks[this.state.roundIdx]?.id || null,
    };
  }

  broadcastState() {
    this.broadcast(JSON.stringify({ type: "state", state: this.snapshot() }));
  }
}
