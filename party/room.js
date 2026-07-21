import { Server } from "partyserver";
import { isCorrect, matchesAnyArtist } from "../src/match.js";
import {
  STEPS,
  MAX_GUESSES,
  ROUND_COUNT,
  PLAYER_COLORS,
  shuffle,
  normalizeAvatar,
  randomAvatar,
} from "../src/multiplayer/constants.js";

/**
 * Multiplayer room (PartyServer / Cloudflare Durable Object).
 * Host DJs Spotify audio and races guesses with guests. First correct title wins.
 */
export class Room extends Server {
  state = null; // set when host claims the room

  onConnect(conn) {
    // Wait for hello / join before treating as a player.
    conn.send(JSON.stringify({ type: "hello", room: this.name }));
  }

  onClose(conn) {
    if (!this.state) return;
    if (this.state.hostConnId === conn.id) {
      this.state.hostConnId = null;
      this.state.hostConnected = false;
      const hostPlayer = this.state.players.find((x) => x.isHost);
      if (hostPlayer) {
        hostPlayer.connected = false;
        hostPlayer.connId = null;
      }
      this.broadcastState();
      return;
    }
    const p = this.state.players.find((x) => x.connId === conn.id);
    if (p) {
      p.connected = false;
      p.connId = null;
      this.broadcastState();
    }
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
        this.handleStart(sender);
        break;
      case "guess":
        this.handleGuess(msg, sender);
        break;
      case "skip":
        this.handleSkip(sender);
        break;
      case "next":
        this.handleNext(sender);
        break;
      case "playState":
        this.handlePlayState(msg, sender);
        break;
      case "rejoin":
        this.handleRejoin(msg, sender);
        break;
      case "profile":
        this.handleProfile(msg, sender);
        break;
      default:
        break;
    }
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
        guessNum: 0,
        guesses: [],
        outcome: null,
        winnerId: null,
        bonus: 0,
        earnedPts: 0,
        playing: false,
        colorIdx: 1,
      };
      sender.send(
        JSON.stringify({ type: "hosted", role: "host", playerId: hostPlayer.id })
      );
      this.broadcastState();
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
        isHost: true,
      };
      this.state.players.unshift(hostPlayer);
    } else {
      hostPlayer.connId = sender.id;
      hostPlayer.connected = true;
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
  }

  handleJoin(msg, sender) {
    if (!this.state) {
      sender.send(JSON.stringify({ type: "error", error: "Room not ready yet — wait for the host." }));
      return;
    }
    if (this.state.phase !== "lobby") {
      sender.send(JSON.stringify({ type: "error", error: "Game already started." }));
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
    };
    this.state.players.push(player);

    sender.send(JSON.stringify({ type: "joined", role: "guest", playerId: player.id }));
    this.broadcastState();
  }

  handleProfile(msg, sender) {
    if (!this.state || this.state.phase !== "lobby") return;
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
    sender.send(JSON.stringify({ type: "joined", role: "guest", playerId: player.id }));
    this.broadcastState();
  }

  handleStart(sender) {
    if (!this.isHost(sender)) return;
    if (!this.state || this.state.phase !== "lobby") return;
    if (this.state.players.filter((p) => p.connected).length < 1) {
      sender.send(JSON.stringify({ type: "error", error: "Need at least one player." }));
      return;
    }
    this.state.phase = "play";
    this.state.roundIdx = 0;
    this.state.guessNum = 0;
    this.state.guesses = [];
    this.state.outcome = null;
    this.state.winnerId = null;
    this.state.bonus = 0;
    this.state.earnedPts = 0;
    this.state.playing = false;
    this.state.artistBonusClaimed = {};
    this.broadcastState();
  }

  handleGuess(msg, sender) {
    if (!this.state || this.state.phase !== "play") return;
    const player = this.playerFor(sender);
    if (!player) {
      sender.send(JSON.stringify({ type: "error", error: "Join the race first." }));
      return;
    }

    const title = String(msg.title || "").trim();
    const artist = String(msg.artist || "").trim();
    if (!title && !artist) return;

    const track = this.state.tracks[this.state.roundIdx];
    if (!track) return;

    const titleOk = title ? isCorrect(title, track.name) : false;
    const artistOk = artist ? matchesAnyArtist(artist, track.artists) : false;
    const win = titleOk;

    // Artist bonus is +1 once per player per round, even without a title win.
    let artistPts = 0;
    if (artistOk && !this.state.artistBonusClaimed?.[player.id]) {
      if (!this.state.artistBonusClaimed) this.state.artistBonusClaimed = {};
      this.state.artistBonusClaimed[player.id] = true;
      artistPts = 1;
      player.score += 1;
    }

    this.state.guesses.push({
      playerId: player.id,
      name: player.name,
      color: player.color,
      avatar: player.avatar,
      title,
      artist,
      titleOk,
      artistOk,
      win,
      artistPts,
    });

    if (win) {
      const titlePts = MAX_GUESSES - this.state.guessNum;
      const earned = titlePts + artistPts;
      this.state.bonus = artistPts;
      this.state.earnedPts = earned;
      this.state.winnerId = player.id;
      this.state.outcome = "win";
      this.state.phase = "reveal";
      this.state.playing = false;
      player.score += titlePts;
      player.wins += 1;
    } else {
      if (artistPts) {
        this.state.bonus = 1;
        this.state.earnedPts = artistPts;
      }
      this.consumeGuess();
    }

    this.broadcastState();
  }

  handleSkip(sender) {
    if (!this.state || this.state.phase !== "play") return;
    // Only the DJ can unlock more audio via skip.
    if (!this.isHost(sender)) {
      sender.send(JSON.stringify({ type: "error", error: "Only the DJ can skip." }));
      return;
    }
    const player = this.playerFor(sender);
    if (!player) return;

    this.state.guesses.push({
      playerId: player.id,
      name: player.name,
      color: player.color,
      avatar: player.avatar,
      skip: true,
    });
    this.consumeGuess();
    this.broadcastState();
  }

  consumeGuess() {
    const next = this.state.guessNum + 1;
    if (next >= MAX_GUESSES) {
      this.state.outcome = "lose";
      this.state.phase = "reveal";
      this.state.playing = false;
      this.state.winnerId = null;
      this.state.earnedPts = 0;
      this.state.bonus = 0;
    } else {
      this.state.guessNum = next;
    }
  }

  handleNext(sender) {
    if (!this.isHost(sender)) return;
    if (!this.state || this.state.phase !== "reveal") return;

    if (this.state.roundIdx + 1 >= this.state.tracks.length) {
      this.state.phase = "over";
      this.state.playing = false;
      this.broadcastState();
      return;
    }

    this.state.roundIdx += 1;
    this.state.guessNum = 0;
    this.state.guesses = [];
    this.state.outcome = null;
    this.state.winnerId = null;
    this.state.bonus = 0;
    this.state.earnedPts = 0;
    this.state.playing = false;
    this.state.artistBonusClaimed = {};
    this.state.phase = "play";
    this.broadcastState();
  }

  handlePlayState(msg, sender) {
    if (!this.isHost(sender) || !this.state) return;
    this.state.playing = !!msg.playing;
    this.broadcastState();
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
    const revealed = this.state.phase === "reveal" || this.state.phase === "over";
    if (revealed) {
      return {
        id: t.id,
        name: t.name,
        artists: t.artists,
        cover: t.cover,
      };
    }
    return { id: t.id, cover: null, name: null, artists: null };
  }

  snapshot() {
    if (!this.state) return { phase: "empty" };
    const unlocked = STEPS[Math.min(this.state.guessNum, MAX_GUESSES - 1)];
    return {
      phase: this.state.phase,
      playlistName: this.state.playlistName,
      hostName: this.state.hostName,
      hostConnected: this.state.hostConnected,
      players: this.state.players.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        avatar: p.avatar || normalizeAvatar(null, p.color),
        score: p.score,
        wins: p.wins,
        connected: p.connected,
        isHost: !!p.isHost,
      })),
      roundIdx: this.state.roundIdx,
      roundCount: this.state.tracks.length,
      guessNum: this.state.guessNum,
      unlocked,
      guesses: this.state.guesses,
      outcome: this.state.outcome,
      winnerId: this.state.winnerId,
      bonus: this.state.bonus,
      earnedPts: this.state.earnedPts,
      playing: this.state.playing,
      track: this.publicTrack(),
      // Host-only full track id for Spotify playback (guests get id too but no secret beyond that —
      // knowing the Spotify id doesn't reveal the title in-UI; they still can't hear without being nearby).
      trackId: this.state.tracks[this.state.roundIdx]?.id || null,
    };
  }

  broadcastState() {
    this.broadcast(JSON.stringify({ type: "state", state: this.snapshot() }));
  }
}
