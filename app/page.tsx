"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Pause, Play, Trash2, LogOut, Plus, Eye, Settings } from "lucide-react";
import * as XLSX from "xlsx";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

type Role = "super_admin" | "admin" | "educator" | "referee";
type Mode = "video" | "non-video";
type Status = "In Review" | "Completed";
type RefSlot = "All Referees" | "Referee 1" | "Referee 2" | "Referee 3";

type OrganisationRecord = { id: string; name: string; status: "Active" | "Suspended"; createdAt: string };
type UserRecord = { id: string; role: Role; name: string; password: string; organisationId: string };
type ReviewRecord = {
  id: string; organisationId: string; game: string; educatorId: string; educatorName: string;
  referee1Id: string; referee2Id: string; referee3Id: string;
  referee1Name: string; referee2Name: string; referee3Name: string;
  videoLink: string; timestampOffset: number; status: Status; createdAt: string; submittedAt?: string;
};
type ClipReferee = { slot: RefSlot; type: "Call" | "Review" };
type CodedTag = {
  id: string; reviewId: string; time: string; seconds: number; adjustedSeconds: number; adjustedTime: string;
  mode: Mode; refereeTarget: RefSlot; extraReviewOfficials: RefSlot[]; clipOfficials: ClipReferee[];
  timestampLink?: string; outcome?: string; category?: string; position?: string; coverage?: string; notes?: string; createdAt: string;
};

const OUTCOMES = ["Correct Call","Correct No Call","Incorrect Call","Incorrect No Call","Review"];
const CATEGORIES = ["Foul - Personal","Foul - Disruptive","Foul - Flagrant","Violation - Travel","Violation - OOB","Violation - GT/BI","Violation - Backcourt","Violation - Other","Mechanics"];
const POSITIONS = ["Trail","Lead","Centre"];
const COVERAGE = ["Primary","Secondary","Extended"];
const REF_SLOTS: RefSlot[] = ["All Referees","Referee 1","Referee 2","Referee 3"];
const ORGS_KEY = "referee-coder-v5-organisations";
const USERS_KEY = "referee-coder-v5-users";
const REVIEWS_KEY = "referee-coder-v5-reviews";
const TAGS_KEY = "referee-coder-v5-tags";

const NON_VIDEO_KEYS: Record<string, Partial<CodedTag>> = {
  "1": { outcome: "Correct Call" }, "2": { outcome: "Correct No Call" },
  "3": { outcome: "Incorrect Call" }, "4": { outcome: "Incorrect No Call" },
  f: { category: "Foul - Personal" }, u: { category: "Foul - Flagrant" },
  d: { category: "Foul - Disruptive" }, t: { category: "Violation - Travel" },
  v: { category: "Violation - Other" }, r: { outcome: "Review" },
};
const KEY_LABELS = [["1","Correct Call"],["2","Correct No Call"],["3","Incorrect Call"],["4","Incorrect No Call"],["F","Foul"],["U","Flagrant"],["D","Disruptive"],["T","Travel"],["V","Violation"],["R","Review"]];

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds || 0);
  const s = Math.floor(safe % 60).toString().padStart(2,"0");
  const m = Math.floor((safe / 60) % 60).toString().padStart(2,"0");
  const h = Math.floor(safe / 3600);
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}
function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : fallback;
}
function saveJson<T>(key: string, value: T) { localStorage.setItem(key, JSON.stringify(value)); }
function csvEscape(value: unknown) { return `"${String(value ?? "").replaceAll('"','""')}"`; }
function percent(n: number, d: number) { return d ? `${Math.round((n / d) * 100)}%` : "—"; }
function countBy(tags: CodedTag[], field: keyof CodedTag) {
  const counts: Record<string, number> = {};
  for (const tag of tags) {
    const value = String(tag[field] || "Uncoded");
    counts[value] = (counts[value] || 0) + 1;
  }
  return Object.entries(counts).sort((a,b) => b[1] - a[1]);
}
function getYouTubeId(link: string) {
  if (!link.trim()) return "";
  try {
    const url = new URL(link.trim());
    const host = url.hostname.toLowerCase();
    if (host.includes("youtube.com")) {
      if (url.pathname.startsWith("/embed/")) return url.pathname.split("/")[2] || "";
      if (url.pathname.startsWith("/shorts/")) return url.pathname.split("/")[2] || "";
      return url.searchParams.get("v") || "";
    }
    if (host.includes("youtu.be")) return url.pathname.replace(/^\//, "").split(/[?#]/)[0];
  } catch {}
  return "";
}
function isYouTubeLink(link: string) { return !!getYouTubeId(link); }
function makeTimestampLink(baseLink: string, seconds: number) {
  if (!baseLink.trim()) return "";
  const clean = baseLink.trim();
  const rounded = Math.max(0, Math.floor(seconds));
  try {
    const url = new URL(clean);
    const host = url.hostname.toLowerCase();
    if (host.includes("youtube.com") || host.includes("youtu.be")) url.searchParams.set("t", `${rounded}s`);
    else if (host.includes("drive.google.com")) url.hash = `t=${rounded}`;
    else url.searchParams.set("t", `${rounded}`);
    return url.toString();
  } catch { return `${clean}#t=${rounded}`; }
}
function embedUrl(link: string, seconds: number, autoplay = false) {
  if (!link.trim()) return "";
  const videoId = getYouTubeId(link);
  if (videoId) return `https://www.youtube.com/embed/${videoId}?start=${Math.floor(Math.max(0, seconds))}&autoplay=${autoplay ? 1 : 0}&enablejsapi=1&rel=0`;
  return link;
}
function slotName(slot: RefSlot, r?: ReviewRecord) {
  if (!r) return slot;
  if (slot === "Referee 1") return r.referee1Name || "Referee 1";
  if (slot === "Referee 2") return r.referee2Name || "Referee 2";
  if (slot === "Referee 3") return r.referee3Name || "Referee 3";
  return "All Referees";
}
function slotForUser(userId: string, r?: ReviewRecord): RefSlot | null {
  if (!r) return null;
  if (userId === r.referee1Id) return "Referee 1";
  if (userId === r.referee2Id) return "Referee 2";
  if (userId === r.referee3Id) return "Referee 3";
  return null;
}
function tagAppliesToSlot(tag: CodedTag, slot: RefSlot | null) {
  if (!slot) return false;
  if (tag.refereeTarget === "All Referees") return true;
  if (tag.refereeTarget === slot) return true;
  return (tag.extraReviewOfficials || []).includes(slot);
}
function makeAnalytics(tags: CodedTag[]) {
  const total = tags.length;
  const correctCalls = tags.filter(t => t.outcome === "Correct Call").length;
  const correctNoCalls = tags.filter(t => t.outcome === "Correct No Call").length;
  const incorrectCalls = tags.filter(t => t.outcome === "Incorrect Call").length;
  const incorrectNoCalls = tags.filter(t => t.outcome === "Incorrect No Call").length;
  const reviews = tags.filter(t => t.outcome === "Review").length;
  const denom = correctCalls + correctNoCalls + incorrectCalls + incorrectNoCalls;
  return {
    total, correctCalls, correctNoCalls, incorrectCalls, incorrectNoCalls, reviews,
    accuracy: percent(correctCalls + correctNoCalls, denom),
    outcomeCounts: countBy(tags, "outcome"), categoryCounts: countBy(tags, "category"),
    coverageCounts: countBy(tags, "coverage"), positionCounts: countBy(tags, "position"),
  };
}

export default function Home() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const youtubeContainerRef = useRef<HTMLDivElement | null>(null);
  const youtubePlayerRef = useRef<any>(null);
  const [organisations, setOrganisations] = useState<OrganisationRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [tags, setTags] = useState<CodedTag[]>([]);
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null);
  const [screen, setScreen] = useState<"login"|"educator"|"referee"|"database"|"reviewer"|"refereeReview">("login");
  const [loginRole, setLoginRole] = useState<Role>("educator");
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [newUserRole, setNewUserRole] = useState<Role>("referee");
  const [newUserOrganisation, setNewUserOrganisation] = useState("");
  const [newOrgName, setNewOrgName] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");

  const [activeReviewId, setActiveReviewId] = useState("");
  const activeReview = reviews.find(r => r.id === activeReviewId);
  const [mode, setMode] = useState<Mode>("video");
  const [analyticsTarget, setAnalyticsTarget] = useState<RefSlot>("All Referees");
  const [videoCurrent, setVideoCurrent] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [youtubeCurrent, setYoutubeCurrent] = useState(0);
  const [youtubeDuration, setYoutubeDuration] = useState(0);
  const [youtubeReady, setYoutubeReady] = useState(false);
  const [viewerAutoplay, setViewerAutoplay] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  const [codingOpen, setCodingOpen] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [codingSecond, setCodingSecond] = useState(0);
  const [shouldResumeVideo, setShouldResumeVideo] = useState(false);
  const [draftRefereeTarget, setDraftRefereeTarget] = useState<RefSlot>("All Referees");
  const [draftExtraOfficials, setDraftExtraOfficials] = useState<RefSlot[]>([]);
  const [draftOutcome, setDraftOutcome] = useState("");
  const [draftCategory, setDraftCategory] = useState("");
  const [draftPosition, setDraftPosition] = useState("");
  const [draftCoverage, setDraftCoverage] = useState("");
  const [draftNotes, setDraftNotes] = useState("");

  const [reviewGame, setReviewGame] = useState("");
  const [reviewRef1, setReviewRef1] = useState("");
  const [reviewRef2, setReviewRef2] = useState("");
  const [reviewRef3, setReviewRef3] = useState("");
  const [reviewVideoLink, setReviewVideoLink] = useState("");
  const [reviewOffset, setReviewOffset] = useState(0);
  const [viewerClipSeconds, setViewerClipSeconds] = useState(0);

  const scopedUsers = useMemo(() => {
    if (!currentUser) return users;
    if (currentUser.role === "super_admin") return users;
    return users.filter(u => u.organisationId === currentUser.organisationId);
  }, [users, currentUser]);
  const refereeUsers = scopedUsers.filter(u => u.role === "referee");
  const adminUsers = scopedUsers.filter(u => u.role === "admin");
  const educatorUsers = scopedUsers.filter(u => u.role === "educator");
  const superAdminUsers = users.filter(u => u.role === "super_admin");
  const currentOrganisation = organisations.find(o => o.id === currentUser?.organisationId);
  const organisationName = (id: string) => organisations.find(o => o.id === id)?.name || "Unassigned";
  const reviewTags = useMemo(() => tags.filter(t => t.reviewId === activeReviewId).sort((a,b) => a.seconds - b.seconds), [tags, activeReviewId]);

  const analyticsTags = useMemo(() => {
    if (analyticsTarget === "All Referees") return reviewTags;
    return reviewTags.filter(t => tagAppliesToSlot(t, analyticsTarget));
  }, [reviewTags, analyticsTarget]);
  const analytics = useMemo(() => makeAnalytics(analyticsTags), [analyticsTags]);

  const activeVideoLink = reviewVideoLink || activeReview?.videoLink || "";
  const youtubeVideoId = getYouTubeId(activeVideoLink);
  const usingYouTubeVideo = mode === "video" && !!youtubeVideoId;
  const currentSeconds = mode === "video" ? (usingYouTubeVideo ? youtubeCurrent : videoCurrent) : timerSeconds;
  const maxTagSeconds = reviewTags.reduce((max,t) => Math.max(max, t.seconds), 0);
  const scaleSeconds = mode === "video" ? (usingYouTubeVideo ? youtubeDuration || Math.max(60, maxTagSeconds) : videoDuration || Math.max(60, maxTagSeconds)) : Math.max(60, timerSeconds, maxTagSeconds);
  const progressPct = Math.min(100, (currentSeconds / scaleSeconds) * 100 || 0);

  useEffect(() => {
    const defaultOrgId = "org-rca";
    let storedOrgs = loadJson<OrganisationRecord[]>(ORGS_KEY, []);
    if (!storedOrgs.length) storedOrgs = [{ id: defaultOrgId, name: "Referee College of Australia", status: "Active", createdAt: new Date().toISOString() }];

    let storedUsers = loadJson<UserRecord[]>(USERS_KEY, []);
    if (!storedUsers.length) {
      storedUsers = [
        { id: crypto.randomUUID(), role: "super_admin", name: "Logan Bilby", password: "admin", organisationId: defaultOrgId },
        { id: crypto.randomUUID(), role: "admin", name: "Demo Admin", password: "admin", organisationId: defaultOrgId },
        { id: crypto.randomUUID(), role: "educator", name: "Demo Educator", password: "educator", organisationId: defaultOrgId },
        { id: crypto.randomUUID(), role: "referee", name: "Demo Referee", password: "demo", organisationId: defaultOrgId },
      ];
    }
    storedUsers = storedUsers.map((u: any) => ({ ...u, role: (u.name === "Logan Bilby" && u.password === "admin") ? "super_admin" : u.role, organisationId: u.organisationId || defaultOrgId }));
    if (!storedUsers.some(u => u.role === "super_admin")) {
      const firstAdmin = storedUsers.find(u => u.role === "admin" || u.role === "educator");
      if (firstAdmin) storedUsers = storedUsers.map(u => u.id === firstAdmin.id ? { ...u, role: "super_admin", organisationId: u.organisationId || defaultOrgId } : u);
    }
    const storedReviews = loadJson<ReviewRecord[]>(REVIEWS_KEY, []).map((r: any) => ({ ...r, organisationId: r.organisationId || storedUsers.find(u => u.id === r.educatorId)?.organisationId || defaultOrgId }));
    saveJson(ORGS_KEY, storedOrgs);
    saveJson(USERS_KEY, storedUsers);
    saveJson(REVIEWS_KEY, storedReviews);
    setOrganisations(storedOrgs);
    setUsers(storedUsers);
    setReviews(storedReviews);
    setTags(loadJson<CodedTag[]>(TAGS_KEY, []).map(t => ({...t, extraReviewOfficials: t.extraReviewOfficials || [], clipOfficials: t.clipOfficials || []})));
  }, []);
  useEffect(() => { saveJson(ORGS_KEY, organisations); }, [organisations]);
  useEffect(() => { saveJson(USERS_KEY, users); }, [users]);
  useEffect(() => { saveJson(REVIEWS_KEY, reviews); }, [reviews]);
  useEffect(() => { saveJson(TAGS_KEY, tags); }, [tags]);

  useEffect(() => {
    if (!usingYouTubeVideo || screen !== "reviewer") return;
    let cancelled = false;
    function loadPlayer() {
      if (cancelled || !youtubeContainerRef.current || !window.YT?.Player) return;
      if (youtubePlayerRef.current?.destroy) youtubePlayerRef.current.destroy();
      setYoutubeReady(false);
      youtubePlayerRef.current = new window.YT.Player(youtubeContainerRef.current, {
        videoId: youtubeVideoId,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: (event: any) => {
            setYoutubeReady(true);
            setYoutubeDuration(event.target.getDuration?.() || 0);
          },
          onStateChange: (event: any) => {
            setYoutubeCurrent(event.target.getCurrentTime?.() || 0);
            setYoutubeDuration(event.target.getDuration?.() || 0);
          }
        }
      });
    }
    if (window.YT?.Player) loadPlayer();
    else {
      const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (!existing) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(script);
      }
      window.onYouTubeIframeAPIReady = loadPlayer;
    }
    return () => { cancelled = true; if (youtubePlayerRef.current?.destroy) { youtubePlayerRef.current.destroy(); youtubePlayerRef.current = null; } };
  }, [usingYouTubeVideo, youtubeVideoId, screen]);

  useEffect(() => {
    if (!usingYouTubeVideo || screen !== "reviewer") return;
    const interval = setInterval(() => {
      const player = youtubePlayerRef.current;
      if (!player?.getCurrentTime) return;
      setYoutubeCurrent(player.getCurrentTime() || 0);
      setYoutubeDuration(player.getDuration?.() || 0);
    }, 250);
    return () => clearInterval(interval);
  }, [usingYouTubeVideo, screen]);

  useEffect(() => {
    if (!timerRunning || mode !== "non-video") return;
    const interval = setInterval(() => setTimerSeconds(s => s + 0.2), 200);
    return () => clearInterval(interval);
  }, [timerRunning, mode]);

  function login() {
    const user = users.find(u => u.role === loginRole && u.name.trim().toLowerCase() === loginName.trim().toLowerCase() && u.password === loginPassword);
    if (!user) { setLoginError("Login failed. Check name, password and role."); return; }
    setCurrentUser(user); setLoginError(""); setLoginPassword(""); setScreen(user.role === "referee" ? "referee" : "educator");
  }
  function logout() { setCurrentUser(null); setActiveReviewId(""); setScreen("login"); }
  function addOrganisation() {
    if (!newOrgName.trim()) return;
    setOrganisations(items => [...items, { id: crypto.randomUUID(), name: newOrgName.trim(), status: "Active", createdAt: new Date().toISOString() }]);
    setNewOrgName("");
  }
  function addUser() {
    if (!currentUser || !newUserName.trim() || !newUserPassword.trim()) return;
    const organisationId = currentUser.role === "super_admin" ? (newUserOrganisation || organisations[0]?.id || "org-rca") : currentUser.organisationId;
    setUsers(items => [...items, { id: crypto.randomUUID(), role: newUserRole, name: newUserName.trim(), password: newUserPassword, organisationId }]);
    setNewUserName(""); setNewUserPassword("");
  }
  function removeUser(id: string) { setUsers(items => items.filter(u => u.id !== id)); }
  function startNewReview() {
    if (!currentUser) return;
    const r1 = refereeUsers[0];
    const review: ReviewRecord = {
      id: crypto.randomUUID(), organisationId: currentUser.organisationId, game: "New Review", educatorId: currentUser.id, educatorName: currentUser.name,
      referee1Id: r1?.id || "", referee2Id: "", referee3Id: "",
      referee1Name: r1?.name || "", referee2Name: "", referee3Name: "",
      videoLink: "", timestampOffset: 0, status: "In Review", createdAt: new Date().toISOString()
    };
    setReviews(items => [review, ...items]); openReviewForEdit(review, true);
  }
  function openReviewForEdit(review: ReviewRecord, alreadyCreated = false) {
    if (!alreadyCreated) setReviews(items => items.map(r => r.id === review.id ? {...r, status: r.status || "In Review"} : r));
    setActiveReviewId(review.id); setReviewGame(review.game); setReviewRef1(review.referee1Id); setReviewRef2(review.referee2Id);
    setReviewRef3(review.referee3Id); setReviewVideoLink(review.videoLink); setReviewOffset(-Math.abs(Math.trunc(Number(review.timestampOffset) || 0)));
    setAnalyticsTarget("All Referees"); setScreen("reviewer");
  }
  function saveReviewMeta(status?: Status) {
    setReviews(items => items.map(review => {
      if (review.id !== activeReviewId) return review;
      const r1 = users.find(u => u.id === reviewRef1); const r2 = users.find(u => u.id === reviewRef2); const r3 = users.find(u => u.id === reviewRef3);
      return {...review, game: reviewGame, referee1Id: reviewRef1, referee2Id: reviewRef2, referee3Id: reviewRef3,
        referee1Name: r1?.name || "", referee2Name: r2?.name || "", referee3Name: r3?.name || "",
        videoLink: reviewVideoLink, timestampOffset: -Math.abs(Math.trunc(Number(reviewOffset) || 0)), status: status || review.status || "In Review",
        submittedAt: status === "Completed" ? new Date().toISOString() : review.submittedAt
      };
    }));
  }
  function saveCompleteLater() { saveReviewMeta("In Review"); setScreen("educator"); }
  function submitReview() { saveReviewMeta("Completed"); setScreen("educator"); }
  function deleteReview(id: string) {
    if (!confirm("Delete this review and all tags?")) return;
    setReviews(items => items.filter(r => r.id !== id)); setTags(items => items.filter(t => t.reviewId !== id));
  }
  function assignedReviewsForReferee(refereeId: string) {
    return reviews.filter(r => r.status === "Completed" && [r.referee1Id, r.referee2Id, r.referee3Id].includes(refereeId));
  }
  function resetDrafts() {
    setDraftRefereeTarget("All Referees"); setDraftExtraOfficials([]); setDraftOutcome(""); setDraftCategory(""); setDraftPosition(""); setDraftCoverage(""); setDraftNotes("");
  }
  function buildTag(baseSeconds: number, tagMode: Mode, patch: Partial<CodedTag>): CodedTag {
    const seconds = Math.max(0, baseSeconds);
    const adjustedSeconds = Math.max(0, seconds + Number(activeReview?.timestampOffset || 0));
    const primary = patch.refereeTarget || draftRefereeTarget || "All Referees";
    const extras = patch.extraReviewOfficials || draftExtraOfficials || [];
    return {
      id: patch.id || crypto.randomUUID(), reviewId: activeReviewId, seconds, time: formatTime(seconds), adjustedSeconds, adjustedTime: formatTime(adjustedSeconds),
      mode: tagMode, refereeTarget: primary, extraReviewOfficials: extras,
      clipOfficials: [{ slot: primary, type: "Call" }, ...extras.map(slot => ({ slot, type: "Review" as const }))],
      timestampLink: makeTimestampLink(activeReview?.videoLink || "", adjustedSeconds),
      outcome: patch.outcome, category: patch.category, position: patch.position, coverage: patch.coverage, notes: patch.notes,
      createdAt: patch.createdAt || new Date().toISOString()
    };
  }
  function playbackSeconds() {
    if (usingYouTubeVideo && youtubePlayerRef.current?.getCurrentTime) return youtubePlayerRef.current.getCurrentTime() || 0;
    return videoCurrent;
  }
  function pauseActiveVideo() {
    if (usingYouTubeVideo && youtubePlayerRef.current?.pauseVideo) {
      const wasPlaying = youtubePlayerRef.current.getPlayerState?.() === 1;
      youtubePlayerRef.current.pauseVideo();
      setYoutubeCurrent(youtubePlayerRef.current.getCurrentTime?.() || youtubeCurrent);
      return wasPlaying;
    }
    const video = videoRef.current;
    const wasPlaying = video ? !video.paused : false;
    if (video) video.pause();
    return wasPlaying;
  }
  function playActiveVideo() {
    if (usingYouTubeVideo && youtubePlayerRef.current?.playVideo) youtubePlayerRef.current.playVideo();
    else videoRef.current?.play();
  }
  function openVideoCoding() {
    saveReviewMeta();
    const current = playbackSeconds();
    const wasPlaying = pauseActiveVideo();
    setEditingTagId(null); setShouldResumeVideo(wasPlaying); setCodingSecond(Math.max(0, current)); resetDrafts(); setCodingOpen(true);
  }
  function openEditTag(tag: CodedTag) {
    if (tag.mode !== "video") return;
    const wasPlaying = pauseActiveVideo();
    setEditingTagId(tag.id); setShouldResumeVideo(wasPlaying); setCodingSecond(tag.seconds);
    setDraftRefereeTarget(tag.refereeTarget || "All Referees"); setDraftExtraOfficials(tag.extraReviewOfficials || []);
    setDraftOutcome(tag.outcome || ""); setDraftCategory(tag.category || ""); setDraftPosition(tag.position || ""); setDraftCoverage(tag.coverage || ""); setDraftNotes(tag.notes || "");
    setCodingOpen(true);
  }
  function saveVideoCode() {
    const patch = { id: editingTagId || undefined, refereeTarget: draftRefereeTarget, extraReviewOfficials: draftExtraOfficials,
      outcome: draftOutcome, category: draftCategory, position: draftPosition, coverage: draftCoverage, notes: draftNotes,
      createdAt: editingTagId ? tags.find(t => t.id === editingTagId)?.createdAt : undefined
    };
    const tag = buildTag(codingSecond, "video", patch);
    if (editingTagId) setTags(items => items.map(item => item.id === editingTagId ? tag : item));
    else setTags(items => [...items, tag]);
    setCodingOpen(false); setEditingTagId(null); if (shouldResumeVideo) playActiveVideo();
  }
  function quickNonVideoTag(patch: Partial<CodedTag>) {
    saveReviewMeta();
    setTags(items => [...items, buildTag(timerSeconds - 10, "non-video", {...patch, refereeTarget: "All Referees", extraReviewOfficials: []})]);
  }
  function toggleExtra(slot: RefSlot) {
    if (slot === draftRefereeTarget) return;
    setDraftExtraOfficials(items => items.includes(slot) ? items.filter(i => i !== slot) : [...items, slot]);
  }
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (["INPUT","TEXTAREA","SELECT"].includes(target.tagName) || screen !== "reviewer") return;
      if (e.code === "Space") {
        e.preventDefault();
        if (mode === "video") {
          if (usingYouTubeVideo && youtubePlayerRef.current?.getPlayerState) {
            youtubePlayerRef.current.getPlayerState() === 1 ? youtubePlayerRef.current.pauseVideo() : youtubePlayerRef.current.playVideo();
          } else { const video = videoRef.current; if (!video) return; video.paused ? video.play() : video.pause(); }
        }
        else setTimerRunning(r => !r);
        return;
      }
      if (mode === "video" && e.key.toLowerCase() === "x") { e.preventDefault(); openVideoCoding(); return; }
      if (mode === "non-video") { const patch = NON_VIDEO_KEYS[e.key.toLowerCase()]; if (patch) { e.preventDefault(); quickNonVideoTag(patch); } }
    }
    window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown);
  });
  function jump(seconds: number) {
    if (mode === "video") {
      if (usingYouTubeVideo && youtubePlayerRef.current?.seekTo) { youtubePlayerRef.current.seekTo(seconds, true); youtubePlayerRef.current.playVideo?.(); setYoutubeCurrent(seconds); }
      else if (videoRef.current) { videoRef.current.currentTime = seconds; videoRef.current.play(); }
    } else setTimerSeconds(seconds);
  }
  function rowsForTags(sourceTags: CodedTag[]) {
    return sourceTags.map(tag => ({
      Game: activeReview?.game || "", Status: activeReview?.status || "", "Referee 1": activeReview?.referee1Name || "", "Referee 2": activeReview?.referee2Name || "", "Referee 3": activeReview?.referee3Name || "",
      "Primary Tagged Official": slotName(tag.refereeTarget, activeReview), "Extra Review Officials": (tag.extraReviewOfficials || []).map(s => slotName(s, activeReview)).join(", "),
      Educator: activeReview?.educatorName || "", Mode: tag.mode, "Video Link": activeReview?.videoLink || "", "Timestamp Link": tag.timestampLink || "",
      "Review Time": tag.time, "Review Seconds": tag.seconds.toFixed(2), "Adjusted Video Time": tag.adjustedTime, "Adjusted Video Seconds": tag.adjustedSeconds.toFixed(2),
      Outcome: tag.outcome || "", Coverage: tag.coverage || "", Position: tag.position || "", Category: tag.category || "", Notes: tag.notes || ""
    }));
  }
  function analyticsRows(target: RefSlot) {
    const targetTags = target === "All Referees" ? reviewTags : reviewTags.filter(t => tagAppliesToSlot(t, target));
    const a = makeAnalytics(targetTags);
    const rows: Record<string, string | number>[] = [
      { Referee: slotName(target, activeReview), Section: "Summary", Metric: "Total coded clips", Value: a.total },
      { Referee: slotName(target, activeReview), Section: "Summary", Metric: "Accuracy", Value: a.accuracy },
      { Referee: slotName(target, activeReview), Section: "Summary", Metric: "Correct Calls", Value: a.correctCalls },
      { Referee: slotName(target, activeReview), Section: "Summary", Metric: "Correct No Calls", Value: a.correctNoCalls },
      { Referee: slotName(target, activeReview), Section: "Summary", Metric: "Incorrect Calls", Value: a.incorrectCalls },
      { Referee: slotName(target, activeReview), Section: "Summary", Metric: "Incorrect No Calls", Value: a.incorrectNoCalls },
      { Referee: slotName(target, activeReview), Section: "Summary", Metric: "Reviews", Value: a.reviews },
    ];
    const add = (section: string, entries: [string, number][]) => entries.forEach(([name,count]) => rows.push({ Referee: slotName(target, activeReview), Section: section, Metric: name, Value: count }));
    add("Outcome", a.outcomeCounts); add("Coverage", a.coverageCounts); add("Position", a.positionCounts); add("Category", a.categoryCounts);
    return rows;
  }
  function exportCsv() {
    saveReviewMeta();
    const rows = rowsForTags(reviewTags);
    const headers = Object.keys(rows[0] || {Game:"",Status:"","Referee 1":"","Referee 2":"","Referee 3":"","Primary Tagged Official":"","Extra Review Officials":"",Educator:"",Mode:"","Video Link":"","Timestamp Link":"","Review Time":"","Review Seconds":"","Adjusted Video Time":"","Adjusted Video Seconds":"",Outcome:"",Coverage:"",Position:"",Category:"",Notes:""});
    const csv = [headers, ...rows.map(row => headers.map(h => row[h as keyof typeof row]))].map(row => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv"}); const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "referee-coded-timestamps.csv"; a.click(); URL.revokeObjectURL(url);
  }
  function exportExcel() {
    saveReviewMeta();
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rowsForTags(reviewTags)), "Coded Clips");
    for (const target of REF_SLOTS) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(analyticsRows(target)), (target === "All Referees" ? "Analytics - All" : `Analytics - ${target}`).substring(0,31));
    XLSX.writeFile(wb, "referee-review-analytics.xlsx");
  }

  function Header() {
    return <header className="header"><div className="brand"><img src="/rca-logo.png" alt="Referee College of Australia logo" className="brand-logo"/><div><p className="eyebrow">Referee College of Australia</p><h1>Referee Coder v5</h1></div></div>{currentUser && <div className="export-row"><button onClick={() => setScreen(currentUser.role === "referee" ? "referee" : "educator")}>Home</button>{(currentUser.role === "admin" || currentUser.role === "super_admin") && <button onClick={() => setScreen("database")}><Settings size={16}/> Admin Dashboard</button>}<button onClick={logout}><LogOut size={16}/> Logout</button></div>}</header>;
  }

  if (screen === "login") return <main><Header/><div className="login-wrap"><section className="panel login-panel"><div className="login-logo-wrap"><img src="/rca-logo.png" alt="Referee College of Australia logo" className="login-logo"/></div><p className="eyebrow">Login</p><h1>Referee Development Platform</h1><div className="mode-switch" style={{marginTop:18}}><button className={loginRole==="super_admin"?"primary":""} onClick={()=>setLoginRole("super_admin")}>Super Admin</button><button className={loginRole==="admin"?"primary":""} onClick={()=>setLoginRole("admin")}>Org Admin</button><button className={loginRole==="educator"?"primary":""} onClick={()=>setLoginRole("educator")}>Educator</button><button className={loginRole==="referee"?"primary":""} onClick={()=>setLoginRole("referee")}>Referee</button></div><div className="form-stack" style={{marginTop:18}}><label>Name<input value={loginName} onChange={e=>setLoginName(e.target.value)} placeholder={loginRole==="super_admin"?"Logan Bilby":loginRole==="admin"?"Demo Admin":loginRole==="educator"?"Demo Educator":"Demo Referee"}/></label><label>Password<input type="password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} placeholder={loginRole==="referee"?"demo":loginRole==="educator"?"educator":"admin"}/></label><button className="primary" onClick={login}>Login</button>{loginError && <p className="danger-text">{loginError}</p>}<p className="hint">Defaults: Super Admin Logan Bilby / admin · Org Admin Demo Admin / admin · Educator Demo Educator / educator · Referee Demo Referee / demo.</p></div></section></div></main>;

  if (screen === "database" && currentUser?.role !== "admin" && currentUser?.role !== "super_admin") setScreen("educator");

  if (screen === "database") {
    const roleOptions: Role[] = currentUser?.role === "super_admin" ? ["super_admin", "admin", "educator", "referee"] : ["admin", "educator", "referee"];
    const UserTable = ({title, items}:{title:string; items:UserRecord[]}) => <><h2 style={{marginTop:24}}>{title}</h2><table><thead><tr><th>Name</th><th>Organisation</th><th>Password</th><th></th></tr></thead><tbody>{items.map(u=><tr key={u.id}><td>{u.name}</td><td>{organisationName(u.organisationId)}</td><td>{u.password}</td><td><button className="danger" onClick={()=>removeUser(u.id)}>Delete</button></td></tr>)}</tbody></table></>;
    return <main><Header/><div className="layout one-col"><section className="panel"><p className="eyebrow">{currentUser?.role === "super_admin" ? "Platform licensing" : organisationName(currentUser?.organisationId || "")}</p><h1>Admin Dashboard</h1><p className="hint">Each organisation is a separate licensed group. Organisation admins manage only their own educators, referees and evaluations. Super Admin can see and manage all groups.</p>{currentUser?.role === "super_admin" && <div className="analytics-card"><h2>Organisations</h2><div className="grid-2"><label>New organisation<input value={newOrgName} onChange={e=>setNewOrgName(e.target.value)} placeholder="Association, school or league name"/></label><div style={{alignSelf:"end"}}><button className="primary" onClick={addOrganisation}><Plus size={16}/> Add Organisation</button></div></div><table><thead><tr><th>Organisation</th><th>Status</th><th>Admins</th><th>Educators</th><th>Referees</th><th>Evaluations</th></tr></thead><tbody>{organisations.map(o=><tr key={o.id}><td>{o.name}</td><td>{o.status}</td><td>{users.filter(u=>u.organisationId===o.id && u.role==="admin").length}</td><td>{users.filter(u=>u.organisationId===o.id && u.role==="educator").length}</td><td>{users.filter(u=>u.organisationId===o.id && u.role==="referee").length}</td><td>{reviews.filter(r=>r.organisationId===o.id).length}</td></tr>)}</tbody></table></div>}<h2 style={{marginTop:24}}>Add User</h2><div className="setup-grid"><label>Role<select value={newUserRole} onChange={e=>setNewUserRole(e.target.value as Role)}>{roleOptions.map(role=><option key={role} value={role}>{role === "super_admin" ? "Super Admin" : role === "admin" ? "Org Admin" : role[0].toUpperCase()+role.slice(1)}</option>)}</select></label>{currentUser?.role === "super_admin" && <label>Organisation<select value={newUserOrganisation} onChange={e=>setNewUserOrganisation(e.target.value)}><option value="">Select organisation</option>{organisations.map(o=><option value={o.id} key={o.id}>{o.name}</option>)}</select></label>}<label>Name<input value={newUserName} onChange={e=>setNewUserName(e.target.value)}/></label><label>Password<input value={newUserPassword} onChange={e=>setNewUserPassword(e.target.value)}/></label></div><br/><button className="primary" onClick={addUser}><Plus size={16}/> Add User</button>{currentUser?.role === "super_admin" && <UserTable title="Super Admins" items={superAdminUsers}/>}<UserTable title="Organisation Admins" items={adminUsers}/><UserTable title="Educators" items={educatorUsers}/><UserTable title="Referees" items={refereeUsers}/></section></div></main>;
  }

  if (screen === "educator") {
    const visibleReviews = currentUser?.role === "super_admin" ? reviews : currentUser?.role === "admin" ? reviews.filter(r => r.organisationId === currentUser.organisationId) : reviews.filter(r => r.educatorId === currentUser?.id && r.organisationId === currentUser?.organisationId);
    const inReview = visibleReviews.filter(r => r.status !== "Completed");
    const completed = visibleReviews.filter(r => r.status === "Completed");
    const ReviewTable = ({items}:{items: ReviewRecord[]}) => <table><thead><tr><th>Game</th><th>Status</th><th>Educator</th><th>Referees</th><th>Tags</th><th></th></tr></thead><tbody>{items.map(review=><tr key={review.id}><td>{review.game}</td><td><span className={`status ${review.status==="Completed"?"done":"review"}`}>{review.status}</span></td><td>{review.educatorName}</td><td>{[review.referee1Name,review.referee2Name,review.referee3Name].filter(Boolean).join(", ")}</td><td>{tags.filter(t=>t.reviewId===review.id).length}</td><td><button onClick={()=>openReviewForEdit(review)}>Open</button><button className="danger" onClick={()=>deleteReview(review.id)}>Delete</button></td></tr>)}</tbody></table>;
    return <main><Header/><div className="layout one-col"><section className="panel"><div className="table-head"><div><p className="eyebrow">{currentUser?.role === "super_admin" ? "Super Admin Portal" : currentUser?.role === "admin" ? "Organisation Admin Portal" : "Educator Portal"}</p><h1>Welcome, {currentUser?.name}</h1></div><button className="primary" onClick={startNewReview}><Plus size={16}/> New Review</button></div><p className="hint">{currentUser?.role === "super_admin" ? "Super Admin view: all organisation evaluations are visible." : currentUser?.role === "admin" ? "Organisation Admin view: evaluations for your organisation are visible." : "Educator view: only evaluations created by you are visible."}</p><h2>Save & Complete Later Playlist</h2><ReviewTable items={inReview}/><h2 style={{marginTop:28}}>Completed Reviews</h2><ReviewTable items={completed}/></section></div></main>;
  }

  if (screen === "referee") {
    const myReviews = currentUser ? assignedReviewsForReferee(currentUser.id) : [];
    return <main><Header/><div className="layout one-col"><section className="panel"><p className="eyebrow">Referee Portal</p><h1>Welcome, {currentUser?.name}</h1><p className="hint">Only submitted/completed evaluations appear here.</p><table><thead><tr><th>Game</th><th>Status</th><th>Educator</th><th>Submitted</th><th>Clips</th><th></th></tr></thead><tbody>{myReviews.map(review=>{ const slot=slotForUser(currentUser?.id||"", review); const visible=tags.filter(t=>t.reviewId===review.id && tagAppliesToSlot(t, slot)); return <tr key={review.id}><td>{review.game}</td><td><span className="status done">{review.status}</span></td><td>{review.educatorName}</td><td>{review.submittedAt ? new Date(review.submittedAt).toLocaleDateString() : "—"}</td><td>{visible.length}</td><td><button onClick={()=>{setActiveReviewId(review.id); setViewerClipSeconds(0); setViewerAutoplay(false); setScreen("refereeReview")}}><Eye size={16}/> View Clips</button></td></tr>})}</tbody></table></section></div></main>;
  }

  if (screen === "refereeReview") {
    const review = activeReview;
    const mySlot = slotForUser(currentUser?.id || "", review);
    const visibleTags = reviewTags.filter(tag => tagAppliesToSlot(tag, mySlot));
    const viewerAnalytics = makeAnalytics(visibleTags);
    const currentEmbed = review?.videoLink ? embedUrl(review.videoLink, viewerClipSeconds, viewerAutoplay) : "";
    const isDirectVideo = /\.(mp4|webm|ogg)(\?|#|$)/i.test(currentEmbed);
    const isIframe = currentEmbed.includes("youtube.com/embed");
    return <main><Header/><div className="layout"><section className="panel"><p className="eyebrow">Referee Evaluation</p><h1>{review?.game}</h1><p className="hint">Educator: {review?.educatorName} · Status: {review?.status}</p>{currentEmbed ? <div className="video-placeholder"><h2>Video Viewer</h2>{isIframe ? <iframe className="video-frame" src={currentEmbed} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/> : isDirectVideo ? <video key={viewerClipSeconds} controls src={currentEmbed + `#t=${Math.floor(viewerClipSeconds)}`} className="video-frame"/> : <p className="hint">This video link cannot be embedded here. Add a YouTube or direct video file link to use the in-page viewer.</p>}<p className="hint">Selected clip time: {formatTime(viewerClipSeconds)}</p></div> : <p className="hint">No video link added. Ask your educator to attach a playable video link.</p>}<h2>View Clips</h2><table><thead><tr><th>Time</th><th>Action</th><th>Type</th><th>Outcome</th><th>Coverage</th><th>Position</th><th>Category</th><th>Comments</th></tr></thead><tbody>{visibleTags.map(tag=>{ const relation = tag.refereeTarget === mySlot ? "Tagged Call" : tag.refereeTarget === "All Referees" ? "Crew" : "Review Only"; return <tr key={tag.id}><td>{tag.adjustedTime}</td><td><button className="primary" onClick={()=>{setViewerClipSeconds(tag.adjustedSeconds); setViewerAutoplay(true);}}>View Clip</button></td><td>{relation}</td><td>{tag.outcome}</td><td>{tag.coverage}</td><td>{tag.position}</td><td>{tag.category}</td><td>{tag.notes}</td></tr>})}</tbody></table></section><aside className="panel side-panel"><div className="analytics-card"><h2>Your Analytics</h2><div className="metric-grid"><div className="metric-tile"><div className="number">{viewerAnalytics.total}</div><div className="hint">Clips</div></div><div className="metric-tile"><div className="number">{viewerAnalytics.accuracy}</div><div className="hint">Accuracy</div></div></div></div><div className="analytics-card"><h3>Outcome Breakdown</h3>{viewerAnalytics.outcomeCounts.map(([n,c])=><div className="metric-row" key={n}><span>{n}</span><strong>{c}</strong></div>)}</div><div className="analytics-card"><h3>Category Breakdown</h3>{viewerAnalytics.categoryCounts.map(([n,c])=><div className="metric-row" key={n}><span>{n}</span><strong>{c}</strong></div>)}</div></aside></div></main>;
  }

  return <main><Header/><div className="layout"><section className="panel"><h2>Review setup</h2><div className="mode-switch"><button className={mode==="video"?"primary":""} onClick={()=>{setMode("video");setTimerRunning(false)}}>Video Review</button><button className={mode==="non-video"?"primary":""} onClick={()=>setMode("non-video")}>Non-Video Mode</button></div><div className="setup-grid"><label>Game<input value={reviewGame} onChange={e=>setReviewGame(e.target.value)} onBlur={()=>saveReviewMeta()}/></label><label>Educator<input value={activeReview?.educatorName || currentUser?.name || ""} disabled/></label><label>Organisation<input value={organisationName(activeReview?.organisationId || currentUser?.organisationId || "")} disabled/></label><label>Status<input value={activeReview?.status || "In Review"} disabled/></label></div><div className="setup-grid"><label>Referee 1<select value={reviewRef1} onChange={e=>setReviewRef1(e.target.value)} onBlur={()=>saveReviewMeta()}><option value="">Select referee</option>{refereeUsers.map(u=><option value={u.id} key={u.id}>{u.name}</option>)}</select></label><label>Referee 2<select value={reviewRef2} onChange={e=>setReviewRef2(e.target.value)} onBlur={()=>saveReviewMeta()}><option value="">Select referee</option>{refereeUsers.map(u=><option value={u.id} key={u.id}>{u.name}</option>)}</select></label><label>Referee 3<select value={reviewRef3} onChange={e=>setReviewRef3(e.target.value)} onBlur={()=>saveReviewMeta()}><option value="">Select referee</option>{refereeUsers.map(u=><option value={u.id} key={u.id}>{u.name}</option>)}</select></label></div><div className="grid-2" style={{marginTop:12}}><label>Video link for referee portal<input value={reviewVideoLink} onChange={e=>setReviewVideoLink(e.target.value)} onBlur={()=>saveReviewMeta()} placeholder="YouTube, direct MP4/WebM link, Hudl/GloryLeague link, etc."/></label><label>Timestamp offset, seconds<input type="number" step="1" max="0" value={reviewOffset} onChange={e=>setReviewOffset(-Math.abs(Math.trunc(Number(e.target.value) || 0)))} onBlur={()=>{setReviewOffset(v=>-Math.abs(Math.trunc(Number(v) || 0))); saveReviewMeta();}}/></label></div>{mode==="video" ? <><div className="toolbar"><label className="file-picker">Upload Local Video<input type="file" accept="video/*" onChange={e=>{const file=e.target.files?.[0]; if(file && videoRef.current) videoRef.current.src=URL.createObjectURL(file)}}/></label><button onClick={()=>{ if(usingYouTubeVideo && youtubePlayerRef.current?.getPlayerState) { youtubePlayerRef.current.getPlayerState() === 1 ? youtubePlayerRef.current.pauseVideo() : youtubePlayerRef.current.playVideo(); } else { videoRef.current?.paused ? videoRef.current?.play() : videoRef.current?.pause(); } }}><Play size={16}/> / <Pause size={16}/></button><button onClick={()=>{ if(usingYouTubeVideo && youtubePlayerRef.current?.seekTo) { const next=Math.max(0, playbackSeconds()-5); youtubePlayerRef.current.seekTo(next,true); setYoutubeCurrent(next); } else if(videoRef.current) videoRef.current.currentTime=Math.max(0,videoRef.current.currentTime-5)}}>-5s</button><button onClick={()=>{ if(usingYouTubeVideo && youtubePlayerRef.current?.seekTo) { const next=playbackSeconds()+5; youtubePlayerRef.current.seekTo(next,true); setYoutubeCurrent(next); } else if(videoRef.current) videoRef.current.currentTime+=5}}>+5s</button><button className="primary" onClick={openVideoCoding}>Tag Moment</button></div>{usingYouTubeVideo ? <div className="video-placeholder"><div ref={youtubeContainerRef} className="video-frame"/><p className="hint">YouTube iframe mode · Current time: {formatTime(youtubeCurrent)}{youtubeReady ? "" : " · loading player..."}</p></div> : <video ref={videoRef} controls onLoadedMetadata={e=>setVideoDuration(e.currentTarget.duration)} onTimeUpdate={e=>setVideoCurrent(e.currentTarget.currentTime)}/>}</> : <div className="timer-card"><div className="timer">{formatTime(timerSeconds)}</div><div className="toolbar"><button className="primary" onClick={()=>setTimerRunning(r=>!r)}>{timerRunning?"Stop Timer":"Start Timer"}</button><button onClick={()=>setTimerSeconds(0)}>Reset</button><button onClick={()=>setTimerSeconds(s=>Math.max(0,s-10))}>-10s</button><button onClick={()=>setTimerSeconds(s=>s+10)}>+10s</button></div><p className="hint">Non-video mode keeps running. Keyboard tags are saved at current timer minus 10 seconds.</p></div>}<div className="timeline"><div className="progress" style={{width:`${progressPct}%`}}/>{reviewTags.map(tag=><div key={tag.id} className="marker" title={`${tag.adjustedTime} — ${slotName(tag.refereeTarget, activeReview)} — ${tag.outcome || tag.category || "Tag"}`} style={{left:`${Math.min(100,(tag.adjustedSeconds/scaleSeconds)*100)}%`}}/>)}</div></section><aside className="panel side-panel"><div className="export-row"><button className="warn" onClick={saveCompleteLater}>Save & Complete Later</button><button className="good" onClick={submitReview}>Submit Review</button></div><div className="export-row"><button onClick={exportCsv}><Download size={16}/> CSV</button><button className="primary" onClick={exportExcel}><Download size={16}/> Excel</button></div><div className="analytics-card"><h2>Performance Analytics</h2><label>Analytics view<select value={analyticsTarget} onChange={e=>setAnalyticsTarget(e.target.value as RefSlot)}>{REF_SLOTS.map(s=><option key={s} value={s}>{slotName(s, activeReview)}</option>)}</select></label><div className="metric-grid" style={{marginTop:10}}><div className="metric-tile"><div className="number">{analytics.total}</div><div className="hint">Total clips</div></div><div className="metric-tile"><div className="number">{analytics.accuracy}</div><div className="hint">Coded accuracy</div></div><div className="metric-tile"><div className="number">{analytics.correctCalls+analytics.correctNoCalls}</div><div className="hint">Correct decisions</div></div><div className="metric-tile"><div className="number">{analytics.incorrectCalls+analytics.incorrectNoCalls}</div><div className="hint">Incorrect decisions</div></div></div></div><div className="analytics-card"><h3>Outcome Breakdown</h3>{analytics.outcomeCounts.map(([n,c])=><div className="metric-row" key={n}><span>{n}</span><strong>{c}</strong></div>)}</div><div className="analytics-card"><h3>Category Breakdown</h3>{analytics.categoryCounts.map(([n,c])=><div className="metric-row" key={n}><span>{n}</span><strong>{c}</strong></div>)}</div>{mode==="video" ? <div className="analytics-card"><button className="primary big-tag" onClick={openVideoCoding}>Tag Moment</button><p className="hint">Shortcut: X opens the video coding panel.</p></div> : <div className="analytics-card"><h2>Non-video hotkeys</h2><div className="hotkey-grid">{KEY_LABELS.map(([k,l])=><div className="hotkey" key={k}><span>{l}</span><kbd>{k}</kbd></div>)}</div></div>}</aside><section className="panel table-panel"><div className="table-head"><h2>Coded clips</h2><button className="danger" onClick={()=>confirm("Clear all tags?") && setTags(items=>items.filter(t=>t.reviewId!==activeReviewId))}><Trash2 size={16}/> Clear Tags</button></div><table><thead><tr><th>Time</th><th>Referees</th><th>Link</th><th>Mode</th><th>Outcome</th><th>Coverage</th><th>Position</th><th>Category</th><th>Comments</th><th></th></tr></thead><tbody>{reviewTags.map(tag=><tr key={tag.id}><td><button onClick={()=>jump(tag.adjustedSeconds)}>{tag.adjustedTime}</button></td><td><strong>{slotName(tag.refereeTarget, activeReview)}</strong> <span className="hint">(Call)</span><br/>{(tag.extraReviewOfficials || []).map(s=><span className="chip" key={s}>{slotName(s, activeReview)} Review</span>)}</td><td>{tag.timestampLink ? <a href={tag.timestampLink} target="_blank">Open timestamp</a> : <span className="hint">No link</span>}</td><td>{tag.mode}</td><td>{tag.outcome}</td><td>{tag.coverage}</td><td>{tag.position}</td><td>{tag.category}</td><td>{tag.notes}</td><td>{tag.mode==="video" && <button onClick={()=>openEditTag(tag)}>Edit</button>}<button className="danger" onClick={()=>setTags(items=>items.filter(item=>item.id!==tag.id))}>Delete</button></td></tr>)}</tbody></table></section></div>{codingOpen && <div className="modal-backdrop"><div className="modal"><div className="modal-title"><div><p className="eyebrow">{editingTagId ? "Edit clip" : "Coding timestamp"}</p><h1>{formatTime(codingSecond)}</h1><p className="hint">Adjusted video time: {formatTime(Math.max(0,codingSecond + Number(activeReview?.timestampOffset || 0)))}</p></div><button onClick={()=>{setCodingOpen(false);setEditingTagId(null);if(shouldResumeVideo) playActiveVideo()}}>Close</button></div><div className="modal-grid"><div className="code-group"><h2>Group 1: Outcome</h2><div className="code-grid">{OUTCOMES.map(item=><button key={item} className={draftOutcome===item?"selected":""} onClick={()=>setDraftOutcome(item)}>{item}</button>)}</div></div><div className="code-group"><h2>Group 2: Coverage</h2><div className="code-grid">{COVERAGE.map(item=><button key={item} className={draftCoverage===item?"selected":""} onClick={()=>setDraftCoverage(item)}>{item}</button>)}</div></div><div className="code-group"><h2>Group 3: Position</h2><div className="code-grid">{POSITIONS.map(item=><button key={item} className={draftPosition===item?"selected":""} onClick={()=>setDraftPosition(item)}>{item}</button>)}</div></div><div className="code-group"><h2>Group 4: Call Category</h2><div className="code-grid">{CATEGORIES.map(item=><button key={item} className={draftCategory===item?"selected":""} onClick={()=>setDraftCategory(item)}>{item}</button>)}</div></div><div className="code-group note-area"><h2>Group 5: Officials + Comments</h2><div className="grid-2"><label>Tagged official for call<select value={draftRefereeTarget} onChange={e=>{setDraftRefereeTarget(e.target.value as RefSlot); setDraftExtraOfficials(items=>items.filter(s=>s !== e.target.value))}}>{REF_SLOTS.map(s=><option key={s} value={s}>{slotName(s, activeReview)}</option>)}</select></label><div><label>Add other officials as review-only</label><div className="toolbar">{REF_SLOTS.filter(s=>s!=="All Referees" && s!==draftRefereeTarget).map(s=><button type="button" key={s} className={draftExtraOfficials.includes(s)?"selected":""} onClick={()=>toggleExtra(s)}>{slotName(s, activeReview)}</button>)}</div></div></div><p className="hint">Extra officials are attached to the clip for review only. They are not counted as the official responsible for the call. Same comments apply to all officials attached to the clip.</p><textarea value={draftNotes} onChange={e=>setDraftNotes(e.target.value)} placeholder="Optional comments"/></div></div><div className="action-row"><button onClick={resetDrafts}>Clear</button><button className="primary" onClick={saveVideoCode}>{editingTagId ? "Save Changes" : "Save Code & Resume"}</button></div></div></div>}</main>;
}
