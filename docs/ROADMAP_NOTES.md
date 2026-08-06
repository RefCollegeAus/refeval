# Roadmap Notes

## Future Courtside Live Tagging

RefEval is currently a hosted-video-review platform only (Local Video upload and
Non-Video Review Mode were removed — see `refactor(review): remove local and
non-video review features`). A separate, dedicated courtside workflow is a
candidate for a future product, not part of the current review workspace.

Working concept:

- Live courtside tagging during the game — no video required at the time of tagging.
- Timer-based observations: referee, category, and notes captured in the moment.
- Offline-capable session, so connectivity at the venue isn't a blocker.
- After the game, attach a hosted game video to the session.
- Enter a game/video alignment offset (the gap between when live tagging started
  and when the video's own clock starts).
- Convert the live tag times into video timestamps using that offset.
- Import the aligned tags into a RefEval review, joining the courtside session's
  observations with the hosted-video review workflow.

This is intentionally out of scope for the current codebase — no schema, UI, or
state for it exists yet. When it's picked up, it should be designed as its own
workflow rather than reviving the removed non-video mode, since the courtside
timer needs live capture + later alignment, not an always-non-video fallback
inside the review workspace.
