"use client";

import { Header } from "@/components/Header";
import { LoginScreen } from "@/components/LoginScreen";
import { OrganisationSelector } from "@/components/OrganisationSelector";
import { MembersScreen } from "@/components/admin/MembersScreen";
import { OrgSettingsScreen } from "@/components/admin/OrgSettingsScreen";
import { UserProfileScreen } from "@/components/admin/UserProfileScreen";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Pause, Play, Trash2, Plus, Eye } from "lucide-react";
import * as XLSX from "xlsx";
import { useAuthSession } from "@/lib/hooks/useAuthSession";
import { useOrganisations } from "@/lib/hooks/useOrganisations";
import { useReviews } from "@/lib/hooks/useReviews";
import { formatTime, makeTimestampLink } from "@/lib/utils/time";
import { makeAnalytics } from "@/lib/utils/analytics";
import type { Screen } from "@/lib/types/auth";
import type { ReviewRecord, CodedTag, Mode, RefSlot } from "@/lib/types/reviews";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const OUTCOMES = ["Correct Call", "Correct No Call", "Incorrect Call", "Incorrect No Call", "Review"];
const CATEGORIES = ["Foul - Personal", "Foul - Disruptive", "Foul - Flagrant", "Violation - Travel", "Violation - OOB", "Violation - GT/BI", "Violation - Backcourt", "Violation - Other", "Mechanics"];
const POSITIONS = ["Trail", "Lead", "Centre"];
const COVERAGE = ["Primary", "Secondary", "Extended"];
const REF_SLOTS: RefSlot[] = ["All Referees", "Referee 1", "Referee 2", "Referee 3"];

const NON_VIDEO_KEYS: Record<string, Partial<CodedTag>> = {
  "1": { outcome: "Correct Call" }, "2": { outcome: "Correct No Call" },
  "3": { outcome: "Incorrect Call" }, "4": { outcome: "Incorrect No Call" },
  f: { category: "Foul - Personal" }, u: { category: "Foul - Flagrant" },
  d: { category: "Foul - Disruptive" }, t: { category: "Violation - Travel" },
  v: { category: "Violation - Other" }, r: { outcome: "Review" },
};
const KEY_LABELS = [["1", "Correct Call"], ["2", "Correct No Call"], ["3", "Incorrect Call"], ["4", "Incorrect No Call"], ["F", "Foul"], ["U", "Flagrant"], ["D", "Disruptive"], ["T", "Travel"], ["V", "Violation"], ["R", "Review"]];

function csvEscape(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }
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
  } catch { }
  return "";
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

export default function Home() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const youtubeContainerRef = useRef<HTMLDivElement | null>(null);
  const youtubePlayerRef = useRef<any>(null);

  // --- Screen state ---
  const [screen, setScreen] = useState<Screen>("login");

  // --- Hooks ---
  const {
    session, pendingSession, authChecked,
    loginName, setLoginName, loginPassword, setLoginPassword, loginError,
    login, logout: authLogout, selectOrganisation, switchOrganisation, updateSessionProfile,
  } = useAuthSession(setScreen);

  const {
    organisations, members, refreshMembers, refreshOrganisations,
    refereeMembers, adminMembers, educatorMembers, superAdminMembers,
    organisationName, activeOrg,
  } = useOrganisations(session?.activeOrganisation?.id);

  const {
    reviews, tags, setTags,
    activeReviewId, setActiveReviewId,
    activeReview,
    reviewGame, setReviewGame,
    reviewRef1, setReviewRef1,
    reviewRef2, setReviewRef2,
    reviewRef3, setReviewRef3,
    reviewVideoLink, setReviewVideoLink,
    reviewOffset, setReviewOffset,
    openForEdit,
    startNewReview: createNewReview,
    saveReviewMeta,
    deleteReview,
    upsertClip,
    deleteClip,
    clearReviewClips,
    assignedReviewsForReferee,
  } = useReviews(session, members);

  // --- Navigation wrappers ---
  async function logout() {
    setActiveReviewId("");
    await authLogout();
  }

  async function startNewReview() {
    const review = await createNewReview();
    if (review) {
      openForEdit(review, true);
      setAnalyticsTarget("All Referees");
      setScreen("reviewer");
    }
  }

  function openReviewForEdit(review: ReviewRecord, alreadyCreated = false) {
    openForEdit(review, alreadyCreated);
    setAnalyticsTarget("All Referees");
    setScreen("reviewer");
  }

  async function saveCompleteLater() { await saveReviewMeta("In Review"); setScreen("educator"); }
  async function submitReview() { await saveReviewMeta("Completed"); setScreen("educator"); }

  // --- UI state ---
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

  const [viewerClipSeconds, setViewerClipSeconds] = useState(0);


  // --- Auth callback error (from ?error= param set by /auth/callback on failure) ---
  const [urlAuthError, setUrlAuthError] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) {
      setUrlAuthError(decodeURIComponent(err));
      // Remove the param from the URL without reloading.
      const clean = window.location.pathname;
      window.history.replaceState({}, "", clean);
    }
  }, []);

  // --- Derived values ---
  const reviewTags = useMemo(() => tags.filter(t => t.reviewId === activeReviewId).sort((a, b) => a.seconds - b.seconds), [tags, activeReviewId]);
  const analyticsTags = useMemo(() => {
    if (analyticsTarget === "All Referees") return reviewTags;
    return reviewTags.filter(t => tagAppliesToSlot(t, analyticsTarget));
  }, [reviewTags, analyticsTarget]);
  const analytics = useMemo(() => makeAnalytics(analyticsTags), [analyticsTags]);

  const activeVideoLink = reviewVideoLink || activeReview?.videoLink || "";
  const youtubeVideoId = getYouTubeId(activeVideoLink);
  const usingYouTubeVideo = mode === "video" && !!youtubeVideoId;
  const currentSeconds = mode === "video" ? (usingYouTubeVideo ? youtubeCurrent : videoCurrent) : timerSeconds;
  const maxTagSeconds = reviewTags.reduce((max, t) => Math.max(max, t.seconds), 0);
  const scaleSeconds = mode === "video" ? (usingYouTubeVideo ? youtubeDuration || Math.max(60, maxTagSeconds) : videoDuration || Math.max(60, maxTagSeconds)) : Math.max(60, timerSeconds, maxTagSeconds);
  const progressPct = Math.min(100, (currentSeconds / scaleSeconds) * 100 || 0);

  // --- YouTube player effect ---
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

  // --- Tag / coding helpers ---
  function resetDrafts() {
    setDraftRefereeTarget("All Referees"); setDraftExtraOfficials([]); setDraftOutcome(""); setDraftCategory(""); setDraftPosition(""); setDraftCoverage(""); setDraftNotes("");
  }

  function buildTag(baseSeconds: number, tagMode: Mode, patch: Partial<CodedTag>): CodedTag {
    const seconds = Math.max(0, baseSeconds);
    const adjustedSeconds = Math.max(0, seconds + Number(activeReview?.timestampOffset || 0));
    const primary = patch.refereeTarget || draftRefereeTarget || "All Referees";
    const extras = patch.extraReviewOfficials || draftExtraOfficials || [];
    return {
      id: patch.id || crypto.randomUUID(),
      reviewId: activeReviewId,
      organisationId: activeReview?.organisationId || session?.activeOrganisation?.id || "",
      seconds, time: formatTime(seconds), adjustedSeconds, adjustedTime: formatTime(adjustedSeconds),
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

  async function saveVideoCode() {
    const patch = {
      id: editingTagId || undefined,
      refereeTarget: draftRefereeTarget, extraReviewOfficials: draftExtraOfficials,
      outcome: draftOutcome, category: draftCategory, position: draftPosition,
      coverage: draftCoverage, notes: draftNotes,
      createdAt: editingTagId ? tags.find(t => t.id === editingTagId)?.createdAt : undefined,
    };
    const tag = buildTag(codingSecond, "video", patch);
    await upsertClip(tag);
    if (editingTagId) setTags(items => items.map(item => item.id === editingTagId ? tag : item));
    else setTags(items => [...items, tag]);
    setCodingOpen(false);
    setEditingTagId(null);
    if (shouldResumeVideo) playActiveVideo();
  }

  async function quickNonVideoTag(patch: Partial<CodedTag>) {
    saveReviewMeta();
    const tag = buildTag(timerSeconds - 10, "non-video", { ...patch, refereeTarget: "All Referees", extraReviewOfficials: [] });
    setTags(items => [...items, tag]);
    await upsertClip(tag);
  }

  function toggleExtra(slot: RefSlot) {
    if (slot === draftRefereeTarget) return;
    setDraftExtraOfficials(items => items.includes(slot) ? items.filter(i => i !== slot) : [...items, slot]);
  }

  function jump(seconds: number) {
    if (mode === "video") {
      if (usingYouTubeVideo && youtubePlayerRef.current?.seekTo) { youtubePlayerRef.current.seekTo(seconds, true); youtubePlayerRef.current.playVideo?.(); setYoutubeCurrent(seconds); }
      else if (videoRef.current) { videoRef.current.currentTime = seconds; videoRef.current.play(); }
    } else setTimerSeconds(seconds);
  }

  // Guard: non-admin roles cannot visit admin-only screens.
  // Must be declared before any early return to satisfy the Rules of Hooks.
  useEffect(() => {
    const adminScreens: Screen[] = ["database", "org-settings"];
    if (
      adminScreens.includes(screen) &&
      session?.activeRole !== "admin" &&
      session?.activeRole !== "super_admin"
    ) {
      setScreen("educator");
    }
  }, [screen, session?.activeRole]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || screen !== "reviewer") return;
      if (e.code === "Space") {
        e.preventDefault();
        if (mode === "video") {
          if (usingYouTubeVideo && youtubePlayerRef.current?.getPlayerState) {
            youtubePlayerRef.current.getPlayerState() === 1 ? youtubePlayerRef.current.pauseVideo() : youtubePlayerRef.current.playVideo();
          } else { const video = videoRef.current; if (!video) return; video.paused ? video.play() : video.pause(); }
        } else setTimerRunning(r => !r);
        return;
      }
      if (mode === "video" && e.key.toLowerCase() === "x") { e.preventDefault(); openVideoCoding(); return; }
      if (mode === "non-video") { const patch = NON_VIDEO_KEYS[e.key.toLowerCase()]; if (patch) { e.preventDefault(); quickNonVideoTag(patch); } }
    }
    window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown);
  });

  // --- Export helpers ---
  function rowsForTags(sourceTags: CodedTag[]) {
    return sourceTags.map(tag => ({
      Game: activeReview?.game || "", Status: activeReview?.status || "",
      "Referee 1": activeReview?.referee1Name || "", "Referee 2": activeReview?.referee2Name || "", "Referee 3": activeReview?.referee3Name || "",
      "Primary Tagged Official": slotName(tag.refereeTarget, activeReview),
      "Extra Review Officials": (tag.extraReviewOfficials || []).map(s => slotName(s, activeReview)).join(", "),
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
    const add = (section: string, entries: [string, number][]) => entries.forEach(([name, count]) => rows.push({ Referee: slotName(target, activeReview), Section: section, Metric: name, Value: count }));
    add("Outcome", a.outcomeCounts); add("Coverage", a.coverageCounts); add("Position", a.positionCounts); add("Category", a.categoryCounts);
    return rows;
  }

  function exportCsv() {
    saveReviewMeta();
    const rows = rowsForTags(reviewTags);
    const headers = Object.keys(rows[0] || { Game: "", Status: "", "Referee 1": "", "Referee 2": "", "Referee 3": "", "Primary Tagged Official": "", "Extra Review Officials": "", Educator: "", Mode: "", "Video Link": "", "Timestamp Link": "", "Review Time": "", "Review Seconds": "", "Adjusted Video Time": "", "Adjusted Video Seconds": "", Outcome: "", Coverage: "", Position: "", Category: "", Notes: "" });
    const csv = [headers, ...rows.map(row => headers.map(h => row[h as keyof typeof row]))].map(row => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "referee-coded-timestamps.csv"; a.click(); URL.revokeObjectURL(url);
  }

  function exportExcel() {
    saveReviewMeta();
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rowsForTags(reviewTags)), "Coded Clips");
    for (const target of REF_SLOTS) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(analyticsRows(target)), (target === "All Referees" ? "Analytics - All" : `Analytics - ${target}`).substring(0, 31));
    XLSX.writeFile(wb, "referee-review-analytics.xlsx");
  }

  // --- Render ---
  if (!authChecked) return null;

  if (screen === "login")
    return (
      <main>
        <Header session={null} onHome={() => {}} onAdmin={() => {}} onProfile={() => {}} onLogout={logout} />
        <LoginScreen
          loginName={loginName} setLoginName={setLoginName}
          loginPassword={loginPassword} setLoginPassword={setLoginPassword}
          loginError={loginError || urlAuthError} login={login}
        />
      </main>
    );

  if (screen === "org-selector" && pendingSession)
    return (
      <main>
        <Header session={null} onHome={() => {}} onAdmin={() => {}} onProfile={() => {}} onLogout={logout} />
        <OrganisationSelector
          memberships={pendingSession.memberships}
          onSelect={selectOrganisation}
          onLogout={logout}
        />
      </main>
    );

  if (screen === "database") {
    return (
      <main>
        <Header
          session={session}
          onHome={() => setScreen(session?.activeRole === "referee" ? "referee" : "educator")}
          onAdmin={() => setScreen("database")}
          onProfile={() => setScreen("user-profile")}
          onLogout={logout}
        />
        <MembersScreen
          session={session!}
          onNavigateSettings={() => setScreen("org-settings")}
          onRefreshOrgMembers={refreshMembers}
        />
      </main>
    );
  }

  if (screen === "org-settings") {
    const org = activeOrg ?? organisations[0];
    if (!org) return null;
    return (
      <main>
        <Header
          session={session}
          onHome={() => setScreen(session?.activeRole === "referee" ? "referee" : "educator")}
          onAdmin={() => setScreen("database")}
          onProfile={() => setScreen("user-profile")}
          onLogout={logout}
        />
        <OrgSettingsScreen
          session={session!}
          org={org}
          onSaved={() => refreshOrganisations()}
          onNavigateMembers={() => setScreen("database")}
        />
      </main>
    );
  }

  if (screen === "user-profile") {
    return (
      <main>
        <Header
          session={session}
          onHome={() => setScreen(session?.activeRole === "referee" ? "referee" : "educator")}
          onAdmin={() => setScreen("database")}
          onProfile={() => setScreen("user-profile")}
          onLogout={logout}
        />
        <UserProfileScreen
          session={session!}
          onBack={() => setScreen(session?.activeRole === "referee" ? "referee" : "educator")}
          onSwitchOrg={switchOrganisation}
          onProfileNameSaved={updateSessionProfile}
        />
      </main>
    );
  }

  if (screen === "educator") {
    const visibleReviews = session?.activeRole === "super_admin"
      ? reviews
      : session?.activeRole === "admin"
        ? reviews.filter(r => r.organisationId === session.activeOrganisation?.id)
        : reviews.filter(r => r.educatorId === session?.user.id && r.organisationId === session?.activeOrganisation?.id);
    const inReview = visibleReviews.filter(r => r.status !== "Completed");
    const completed = visibleReviews.filter(r => r.status === "Completed");
    const withVideo = visibleReviews.filter(r => r.videoLink).length;
    const withClips = visibleReviews.filter(r => tags.some(t => t.reviewId === r.id)).length;
    const completionRate = visibleReviews.length > 0 ? `${Math.round((completed.length / visibleReviews.length) * 100)}%` : "—";

    const ReviewTable = ({ items }: { items: ReviewRecord[] }) => (
      <table>
        <thead><tr><th>Game</th><th>Status</th><th>Educator</th><th>Referees</th><th>Tags</th><th></th></tr></thead>
        <tbody>
          {items.map(review => (
            <tr key={review.id}>
              <td>{review.game}</td>
              <td><span className={`status ${review.status === "Completed" ? "done" : "review"}`}>{review.status}</span></td>
              <td>{review.educatorName}</td>
              <td>{[review.referee1Name, review.referee2Name, review.referee3Name].filter(Boolean).join(", ")}</td>
              <td>{tags.filter(t => t.reviewId === review.id).length}</td>
              <td>
                <button onClick={() => openReviewForEdit(review)}>Open</button>
                <button className="danger" onClick={() => deleteReview(review.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
    return (
      <main>
        <Header session={session} onHome={() => setScreen(session?.activeRole === "referee" ? "referee" : "educator")} onAdmin={() => setScreen("database")} onProfile={() => setScreen("user-profile")} onLogout={logout} />
        <div className="layout one-col">
          <section className="panel">
            <div className="table-head">
              <div>
                <p className="eyebrow">{session?.activeRole === "super_admin" ? "Super Admin Portal" : session?.activeRole === "admin" ? "Organisation Admin Portal" : "Educator Portal"}</p>
                <h1>Welcome, {session?.profile.name}</h1>
              </div>
              <button className="primary" onClick={startNewReview}><Plus size={16} /> New Review</button>
            </div>
            <p className="hint">{session?.activeRole === "super_admin" ? "Super Admin view: all organisation evaluations are visible." : session?.activeRole === "admin" ? "Organisation Admin view: evaluations for your organisation are visible." : "Educator view: only evaluations created by you are visible."}</p>
            {visibleReviews.length > 0 && (
              <div className="analytics-card" style={{ marginTop: 16, marginBottom: 4 }}>
                <h3>Evaluations Summary</h3>
                <div className="metric-grid">
                  <div className="metric-tile"><div className="number">{visibleReviews.length}</div><div className="hint">Total</div></div>
                  <div className="metric-tile"><div className="number">{completed.length}</div><div className="hint">Completed</div></div>
                  <div className="metric-tile"><div className="number">{inReview.length}</div><div className="hint">Outstanding</div></div>
                  <div className="metric-tile"><div className="number">{completionRate}</div><div className="hint">Completion rate</div></div>
                  <div className="metric-tile"><div className="number">{withVideo}</div><div className="hint">With video</div></div>
                  <div className="metric-tile"><div className="number">{withClips}</div><div className="hint">With coded clips</div></div>
                </div>
              </div>
            )}
            <h2>Save & Complete Later Playlist</h2>
            <ReviewTable items={inReview} />
            <h2 style={{ marginTop: 28 }}>Completed Reviews</h2>
            <ReviewTable items={completed} />
          </section>
        </div>
      </main>
    );
  }

  if (screen === "referee") {
    const myReviews = session ? assignedReviewsForReferee(session.user.id) : [];
    const allMyTags = myReviews.flatMap(review => {
      const slot = slotForUser(session?.user.id || "", review);
      return tags.filter(t => t.reviewId === review.id && tagAppliesToSlot(t, slot));
    });
    const myAnalytics = makeAnalytics(allMyTags);
    return (
      <main>
        <Header session={session} onHome={() => setScreen(session?.activeRole === "referee" ? "referee" : "educator")} onAdmin={() => setScreen("database")} onProfile={() => setScreen("user-profile")} onLogout={logout} />
        <div className="layout one-col">
          <section className="panel">
            <p className="eyebrow">Referee Portal</p>
            <h1>Welcome, {session?.profile.name}</h1>
            <p className="hint">Only submitted/completed evaluations appear here.</p>
            {myReviews.length > 0 && (
              <div className="analytics-card" style={{ marginTop: 16, marginBottom: 4 }}>
                <h3>Your Performance Summary</h3>
                <div className="metric-grid">
                  <div className="metric-tile"><div className="number">{myReviews.length}</div><div className="hint">Evaluations</div></div>
                  <div className="metric-tile"><div className="number">{allMyTags.length}</div><div className="hint">Total clips</div></div>
                  {allMyTags.length > 0 && <div className="metric-tile"><div className="number">{myAnalytics.accuracy}</div><div className="hint">Accuracy</div></div>}
                </div>
              </div>
            )}
            {allMyTags.length > 0 && (
              <>
                <div className="analytics-card"><h3>Outcome Breakdown</h3>{myAnalytics.outcomeCounts.map(([n, c]) => <div className="metric-row" key={n}><span>{n}</span><strong>{c}</strong></div>)}</div>
                <div className="analytics-card"><h3>Category Breakdown</h3>{myAnalytics.categoryCounts.map(([n, c]) => <div className="metric-row" key={n}><span>{n}</span><strong>{c}</strong></div>)}</div>
                <div className="analytics-card"><h3>Position Breakdown</h3>{myAnalytics.positionCounts.map(([n, c]) => <div className="metric-row" key={n}><span>{n}</span><strong>{c}</strong></div>)}</div>
                <div className="analytics-card"><h3>Coverage Breakdown</h3>{myAnalytics.coverageCounts.map(([n, c]) => <div className="metric-row" key={n}><span>{n}</span><strong>{c}</strong></div>)}</div>
              </>
            )}
            <table>
              <thead><tr><th>Game</th><th>Status</th><th>Educator</th><th>Submitted</th><th>Clips</th><th>Accuracy</th><th></th></tr></thead>
              <tbody>
                {myReviews.map(review => {
                  const slot = slotForUser(session?.user.id || "", review);
                  const visible = tags.filter(t => t.reviewId === review.id && tagAppliesToSlot(t, slot));
                  return (
                    <tr key={review.id}>
                      <td>{review.game}</td>
                      <td><span className="status done">{review.status}</span></td>
                      <td>{review.educatorName}</td>
                      <td>{review.submittedAt ? new Date(review.submittedAt).toLocaleDateString() : "—"}</td>
                      <td>{visible.length}</td>
                      <td>{makeAnalytics(visible).accuracy}</td>
                      <td><button onClick={() => { setActiveReviewId(review.id); setViewerClipSeconds(0); setViewerAutoplay(false); setScreen("refereeReview"); }}><Eye size={16} /> View Clips</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>
      </main>
    );
  }

  if (screen === "refereeReview") {
    const review = activeReview;
    const mySlot = slotForUser(session?.user.id || "", review);
    const visibleTags = reviewTags.filter(tag => tagAppliesToSlot(tag, mySlot));
    const viewerAnalytics = makeAnalytics(visibleTags);
    const currentEmbed = review?.videoLink ? embedUrl(review.videoLink, viewerClipSeconds, viewerAutoplay) : "";
    const isDirectVideo = /\.(mp4|webm|ogg)(\?|#|$)/i.test(currentEmbed);
    const isIframe = currentEmbed.includes("youtube.com/embed");
    return <main><Header session={session} onHome={() => setScreen(session?.activeRole === "referee" ? "referee" : "educator")} onAdmin={() => setScreen("database")} onProfile={() => setScreen("user-profile")} onLogout={logout} /><div className="layout"><section className="panel"><p className="eyebrow">Referee Evaluation</p><h1>{review?.game}</h1><p className="hint">Educator: {review?.educatorName} · Status: {review?.status}</p>{currentEmbed ? <div className="video-placeholder"><h2>Video Viewer</h2>{isIframe ? <iframe className="video-frame" src={currentEmbed} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : isDirectVideo ? <video key={viewerClipSeconds} controls src={currentEmbed + `#t=${Math.floor(viewerClipSeconds)}`} className="video-frame" /> : <p className="hint">This video link cannot be embedded here. Add a YouTube or direct video file link to use the in-page viewer.</p>}<p className="hint">Selected clip time: {formatTime(viewerClipSeconds)}</p></div> : <p className="hint">No video link added. Ask your educator to attach a playable video link.</p>}<h2>View Clips</h2><table><thead><tr><th>Time</th><th>Action</th><th>Type</th><th>Outcome</th><th>Coverage</th><th>Position</th><th>Category</th><th>Comments</th></tr></thead><tbody>{visibleTags.map(tag => { const relation = tag.refereeTarget === mySlot ? "Tagged Call" : tag.refereeTarget === "All Referees" ? "Crew" : "Review Only"; return <tr key={tag.id}><td>{tag.adjustedTime}</td><td><button className="primary" onClick={() => { setViewerClipSeconds(tag.adjustedSeconds); setViewerAutoplay(true); }}>View Clip</button></td><td>{relation}</td><td>{tag.outcome}</td><td>{tag.coverage}</td><td>{tag.position}</td><td>{tag.category}</td><td>{tag.notes}</td></tr>; })}</tbody></table></section><aside className="panel side-panel"><div className="analytics-card"><h2>Your Analytics</h2><div className="metric-grid"><div className="metric-tile"><div className="number">{viewerAnalytics.total}</div><div className="hint">Clips</div></div><div className="metric-tile"><div className="number">{viewerAnalytics.accuracy}</div><div className="hint">Accuracy</div></div></div></div><div className="analytics-card"><h3>Outcome Breakdown</h3>{viewerAnalytics.outcomeCounts.map(([n, c]) => <div className="metric-row" key={n}><span>{n}</span><strong>{c}</strong></div>)}</div><div className="analytics-card"><h3>Category Breakdown</h3>{viewerAnalytics.categoryCounts.map(([n, c]) => <div className="metric-row" key={n}><span>{n}</span><strong>{c}</strong></div>)}</div><div className="analytics-card"><h3>Position Breakdown</h3>{viewerAnalytics.positionCounts.map(([n, c]) => <div className="metric-row" key={n}><span>{n}</span><strong>{c}</strong></div>)}</div><div className="analytics-card"><h3>Coverage Breakdown</h3>{viewerAnalytics.coverageCounts.map(([n, c]) => <div className="metric-row" key={n}><span>{n}</span><strong>{c}</strong></div>)}</div></aside></div></main>;
  }

  return <main><Header session={session} onHome={() => setScreen(session?.activeRole === "referee" ? "referee" : "educator")} onAdmin={() => setScreen("database")} onProfile={() => setScreen("user-profile")} onLogout={logout} /><div className="layout"><section className="panel"><h2>Review setup</h2><div className="mode-switch"><button className={mode === "video" ? "primary" : ""} onClick={() => { setMode("video"); setTimerRunning(false); }}>Video Review</button><button className={mode === "non-video" ? "primary" : ""} onClick={() => setMode("non-video")}>Non-Video Mode</button></div><div className="setup-grid"><label>Game<input value={reviewGame} onChange={e => setReviewGame(e.target.value)} onBlur={() => saveReviewMeta()} /></label><label>Educator<input value={activeReview?.educatorName || session?.profile.name || ""} disabled /></label><label>Organisation<input value={organisationName(activeReview?.organisationId || session?.activeOrganisation?.id || "")} disabled /></label><label>Status<input value={activeReview?.status || "In Review"} disabled /></label></div><div className="setup-grid"><label>Referee 1<select value={reviewRef1} onChange={e => setReviewRef1(e.target.value)} onBlur={() => saveReviewMeta()}><option value="">Select referee</option>{refereeMembers.map(m => <option value={m.id} key={m.id}>{m.name}</option>)}</select></label><label>Referee 2<select value={reviewRef2} onChange={e => setReviewRef2(e.target.value)} onBlur={() => saveReviewMeta()}><option value="">Select referee</option>{refereeMembers.map(m => <option value={m.id} key={m.id}>{m.name}</option>)}</select></label><label>Referee 3<select value={reviewRef3} onChange={e => setReviewRef3(e.target.value)} onBlur={() => saveReviewMeta()}><option value="">Select referee</option>{refereeMembers.map(m => <option value={m.id} key={m.id}>{m.name}</option>)}</select></label></div><div className="grid-2" style={{ marginTop: 12 }}><label>Video link for referee portal<input value={reviewVideoLink} onChange={e => setReviewVideoLink(e.target.value)} onBlur={() => saveReviewMeta()} placeholder="YouTube, direct MP4/WebM link, Hudl/GloryLeague link, etc." /></label><label>Timestamp offset, seconds<input type="number" step="1" max="0" value={reviewOffset} onChange={e => setReviewOffset(-Math.abs(Math.trunc(Number(e.target.value) || 0)))} onBlur={() => { setReviewOffset(v => -Math.abs(Math.trunc(Number(v) || 0))); saveReviewMeta(); }} /></label></div>{mode === "video" ? <><div className="toolbar"><label className="file-picker">Upload Local Video<input type="file" accept="video/*" onChange={e => { const file = e.target.files?.[0]; if (file && videoRef.current) videoRef.current.src = URL.createObjectURL(file); }} /></label><button onClick={() => { if (usingYouTubeVideo && youtubePlayerRef.current?.getPlayerState) { youtubePlayerRef.current.getPlayerState() === 1 ? youtubePlayerRef.current.pauseVideo() : youtubePlayerRef.current.playVideo(); } else { videoRef.current?.paused ? videoRef.current?.play() : videoRef.current?.pause(); } }}><Play size={16} /> / <Pause size={16} /></button><button onClick={() => { if (usingYouTubeVideo && youtubePlayerRef.current?.seekTo) { const next = Math.max(0, playbackSeconds() - 5); youtubePlayerRef.current.seekTo(next, true); setYoutubeCurrent(next); } else if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5); }}>-5s</button><button onClick={() => { if (usingYouTubeVideo && youtubePlayerRef.current?.seekTo) { const next = playbackSeconds() + 5; youtubePlayerRef.current.seekTo(next, true); setYoutubeCurrent(next); } else if (videoRef.current) videoRef.current.currentTime += 5; }}>+5s</button><button className="primary" onClick={openVideoCoding}>Tag Moment</button></div>{usingYouTubeVideo ? <div className="video-placeholder"><div ref={youtubeContainerRef} className="video-frame" /><p className="hint">YouTube iframe mode · Current time: {formatTime(youtubeCurrent)}{youtubeReady ? "" : " · loading player..."}</p></div> : <video ref={videoRef} controls onLoadedMetadata={e => setVideoDuration(e.currentTarget.duration)} onTimeUpdate={e => setVideoCurrent(e.currentTarget.currentTime)} />}</> : <div className="timer-card"><div className="timer">{formatTime(timerSeconds)}</div><div className="toolbar"><button className="primary" onClick={() => setTimerRunning(r => !r)}>{timerRunning ? "Stop Timer" : "Start Timer"}</button><button onClick={() => setTimerSeconds(0)}>Reset</button><button onClick={() => setTimerSeconds(s => Math.max(0, s - 10))}>-10s</button><button onClick={() => setTimerSeconds(s => s + 10)}>+10s</button></div><p className="hint">Non-video mode keeps running. Keyboard tags are saved at current timer minus 10 seconds.</p></div>}<div className="timeline"><div className="progress" style={{ width: `${progressPct}%` }} />{reviewTags.map(tag => <div key={tag.id} className="marker" title={`${tag.adjustedTime} — ${slotName(tag.refereeTarget, activeReview)} — ${tag.outcome || tag.category || "Tag"}`} style={{ left: `${Math.min(100, (tag.adjustedSeconds / scaleSeconds) * 100)}%` }} />)}</div></section><aside className="panel side-panel"><div className="export-row"><button className="warn" onClick={saveCompleteLater}>Save & Complete Later</button><button className="good" onClick={submitReview}>Submit Review</button></div><div className="export-row"><button onClick={exportCsv}><Download size={16} /> CSV</button><button className="primary" onClick={exportExcel}><Download size={16} /> Excel</button></div><div className="analytics-card"><h2>Performance Analytics</h2><label>Analytics view<select value={analyticsTarget} onChange={e => setAnalyticsTarget(e.target.value as RefSlot)}>{REF_SLOTS.map(s => <option key={s} value={s}>{slotName(s, activeReview)}</option>)}</select></label><div className="metric-grid" style={{ marginTop: 10 }}><div className="metric-tile"><div className="number">{analytics.total}</div><div className="hint">Total clips</div></div><div className="metric-tile"><div className="number">{analytics.accuracy}</div><div className="hint">Coded accuracy</div></div><div className="metric-tile"><div className="number">{analytics.correctCalls + analytics.correctNoCalls}</div><div className="hint">Correct decisions</div></div><div className="metric-tile"><div className="number">{analytics.incorrectCalls + analytics.incorrectNoCalls}</div><div className="hint">Incorrect decisions</div></div></div></div><div className="analytics-card"><h3>Outcome Breakdown</h3>{analytics.outcomeCounts.map(([n, c]) => <div className="metric-row" key={n}><span>{n}</span><strong>{c}</strong></div>)}</div><div className="analytics-card"><h3>Category Breakdown</h3>{analytics.categoryCounts.map(([n, c]) => <div className="metric-row" key={n}><span>{n}</span><strong>{c}</strong></div>)}</div><div className="analytics-card"><h3>Position Breakdown</h3>{analytics.positionCounts.map(([n, c]) => <div className="metric-row" key={n}><span>{n}</span><strong>{c}</strong></div>)}</div><div className="analytics-card"><h3>Coverage Breakdown</h3>{analytics.coverageCounts.map(([n, c]) => <div className="metric-row" key={n}><span>{n}</span><strong>{c}</strong></div>)}</div>{mode === "video" ? <div className="analytics-card"><button className="primary big-tag" onClick={openVideoCoding}>Tag Moment</button><p className="hint">Shortcut: X opens the video coding panel.</p></div> : <div className="analytics-card"><h2>Non-video hotkeys</h2><div className="hotkey-grid">{KEY_LABELS.map(([k, l]) => <div className="hotkey" key={k}><span>{l}</span><kbd>{k}</kbd></div>)}</div></div>}</aside><section className="panel table-panel"><div className="table-head"><h2>Coded clips</h2><button className="danger" onClick={async () => { if (!confirm("Clear all tags?")) return; await clearReviewClips(activeReviewId); }}><Trash2 size={16} /> Clear Tags</button></div><table><thead><tr><th>Time</th><th>Referees</th><th>Mode</th><th>Outcome</th><th>Coverage</th><th>Position</th><th>Category</th><th>Comments</th><th></th></tr></thead><tbody>{reviewTags.map(tag => <tr key={tag.id}><td><button onClick={() => jump(tag.adjustedSeconds)}>{tag.adjustedTime}</button></td><td><strong>{slotName(tag.refereeTarget, activeReview)}</strong> <span className="hint">(Call)</span><br />{(tag.extraReviewOfficials || []).map(s => <span className="chip" key={s}>{slotName(s, activeReview)} Review</span>)}</td><td>{tag.mode}</td><td>{tag.outcome}</td><td>{tag.coverage}</td><td>{tag.position}</td><td>{tag.category}</td><td>{tag.notes}</td><td>{tag.mode === "video" && <button onClick={() => openEditTag(tag)}>Edit</button>}<button className="danger" onClick={() => deleteClip(tag.id)}>Delete</button></td></tr>)}</tbody></table></section></div>{codingOpen && <div className="modal-backdrop"><div className="modal"><div className="modal-title"><div><p className="eyebrow">{editingTagId ? "Edit clip" : "Coding timestamp"}</p><h1>{formatTime(codingSecond)}</h1><p className="hint">Adjusted video time: {formatTime(Math.max(0, codingSecond + Number(activeReview?.timestampOffset || 0)))}</p></div><button onClick={() => { setCodingOpen(false); setEditingTagId(null); if (shouldResumeVideo) playActiveVideo(); }}>Close</button></div><div className="modal-grid"><div className="code-group"><h2>Group 1: Outcome</h2><div className="code-grid">{OUTCOMES.map(item => <button key={item} className={draftOutcome === item ? "selected" : ""} onClick={() => setDraftOutcome(item)}>{item}</button>)}</div></div><div className="code-group"><h2>Group 2: Coverage</h2><div className="code-grid">{COVERAGE.map(item => <button key={item} className={draftCoverage === item ? "selected" : ""} onClick={() => setDraftCoverage(item)}>{item}</button>)}</div></div><div className="code-group"><h2>Group 3: Position</h2><div className="code-grid">{POSITIONS.map(item => <button key={item} className={draftPosition === item ? "selected" : ""} onClick={() => setDraftPosition(item)}>{item}</button>)}</div></div><div className="code-group"><h2>Group 4: Call Category</h2><div className="code-grid">{CATEGORIES.map(item => <button key={item} className={draftCategory === item ? "selected" : ""} onClick={() => setDraftCategory(item)}>{item}</button>)}</div></div><div className="code-group note-area"><h2>Group 5: Officials + Comments</h2><div className="grid-2"><label>Tagged official for call<select value={draftRefereeTarget} onChange={e => { setDraftRefereeTarget(e.target.value as RefSlot); setDraftExtraOfficials(items => items.filter(s => s !== e.target.value)); }}>{REF_SLOTS.map(s => <option key={s} value={s}>{slotName(s, activeReview)}</option>)}</select></label><div><label>Add other officials as review-only</label><div className="toolbar">{REF_SLOTS.filter(s => s !== "All Referees" && s !== draftRefereeTarget).map(s => <button type="button" key={s} className={draftExtraOfficials.includes(s) ? "selected" : ""} onClick={() => toggleExtra(s)}>{slotName(s, activeReview)}</button>)}</div></div></div><p className="hint">Extra officials are attached to the clip for review only. They are not counted as the official responsible for the call. Same comments apply to all officials attached to the clip.</p><textarea value={draftNotes} onChange={e => setDraftNotes(e.target.value)} placeholder="Optional comments" /></div></div><div className="action-row"><button onClick={resetDrafts}>Clear</button><button className="primary" onClick={saveVideoCode}>{editingTagId ? "Save Changes" : "Save Code & Resume"}</button></div></div></div>}</main>;
}
