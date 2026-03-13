# Train-Track Feature Roadmap

This roadmap turns the requested feature list into implementation phases with clear sequencing, dependencies, and delivery outcomes.

## Guiding principles

- Ship the logging core first so data quality is high before automation/analytics.
- Prefer reusable domain models (Program, Workout Template, Session, Set Log) over one-off UI logic.
- Keep "planned vs actual" data separate to support post-workout edits and progression.

## Phase 1 — Program and workout authoring foundation

### Features

- **#3 Build program from scratch**
- **#4 Create one-off workout from scratch**
- **#5 Empty workout**
- **#7 Gym profiles**
- **#8 Program schedule editing**
- **#9 Set/swap active programs**
- **#27 Custom exercise creation**

### Why first

These features define the objects users will execute and log later. Without strong authoring and exercise metadata, execution and analytics become inconsistent.

### Core data entities

- `gym_profiles`
- `programs`
- `program_days`
- `program_day_exercises`
- `workout_templates`
- `workout_template_exercises`
- `custom_exercises`

### Acceptance snapshot

- User can create and save a full program cycle with days and exercises.
- User can save reusable standalone workouts.
- User can start from a blank workout for ad hoc sessions.
- User can assign equipment context via gym profile.
- User can set any saved program as active without deleting prior history.

## Phase 2 — Workout execution and high-fidelity logging

### Features

- **#10 Start workout from program or library**
- **#11 Workout preview**
- **#12 Live workout timers**
- **#13 Set-by-set logging table**
- **#14 Pause/minimize/resume session**
- **#15 Adjustable rest timer**
- **#16 Smart warm-ups**
- **#17 Plate calculator**
- **#18 RIR logging/editing**
- **#19 Advanced set types**
- **#20 Partial rep logging**
- **#21 Left/right separate logging**
- **#22 Supersets**
- **#23 Update Program toggle**
- **#24 Edit/delete logged sets after the workout**

### Why second

Execution produces the core event stream for progression and analytics. This phase ensures session data is complete, correctable, and expressive.

### Core data entities

- `workout_sessions`
- `session_exercises`
- `session_sets`
- `set_modifiers` (set type, rir, partial reps, laterality)
- `session_timers`

### Acceptance snapshot

- User can start, pause, resume, and complete workouts from templates/programs.
- User logs each set with load, reps, RIR, and set type.
- User can edit completed workouts from history.
- Program change toggle cleanly scopes edits to current session vs future plan.

## Phase 3 — Progression engine

### Features

- **#30 Smart Progression**
- **#31 Initial log fill modes**

### Why third

Progression quality depends on stable, high-quality session logs from Phase 2.

### Service responsibilities

- Generate next-session recommendations from rep ranges + RIR outcomes.
- Support configurable prefill mode:
  - progression-target prefill
  - previous-values prefill

### Acceptance snapshot

- Future planned sets can be prefilled automatically with user-selected strategy.
- Recommendation logic is explainable and reversible from settings.

## Phase 4 — Analytics, dashboard, and history depth

### Features

- **#36 Weekly Workouts widget**
- **#37 Recent Records widget**
- **#38 Sets-over-time analytics**
- **#39 Volume-over-time analytics**
- **#40 Exercise-level analytics**
- **#41 Muscle-group analytics**
- **#42 Workout history**
- **#44 Shortcuts panel**

### Why fourth

Analytics should be layered on top of complete historical data and progression outputs.

### Analytics outputs

- Weekly completion rings (muscles, sets, exercises).
- Time-series charts for sets and volume.
- Exercise detail views for trend tracking.
- Muscle distribution views to detect over/under-emphasis.

### Acceptance snapshot

- User gets actionable progress insights with filterable date ranges.
- History remains editable and reflected in charts after recalculation.

## Phase 5 — Body metrics and visual progress

### Features

- **#45 Weight logging + habits calendar**
- **#46 Body measurements**
- **#47 Progress photos**
- **#48 Before-and-after photo builder**

### Why fifth

This phase is valuable but can be developed independently once training data flows are stable.

### Core data entities

- `body_metrics`
- `habit_events`
- `progress_photos`
- `photo_comparisons` (optional saved pairs)

### Acceptance snapshot

- User can track body metrics and workout/weigh-in consistency.
- User can upload, crop, and compare progress photos over time.

## Recommended delivery slices (2-week sprint examples)

1. Program/workout creation + active program switching.
2. Session start/preview + base set logging + timers.
3. Advanced set semantics (RIR, set types, laterality, partials, supersets).
4. Post-session editing + plate calculator + warm-ups.
5. Smart progression + prefill modes.
6. Dashboard widgets + time-series analytics + exercise detail.
7. Body metrics + photos + comparison builder.

## Suggested implementation order by architecture layer

1. Database schema + migrations
2. API contracts and validation
3. Domain services (planner, logger, progression, analytics)
4. UI screens and interaction flows
5. QA fixtures and seed data for realistic usage scenarios

## Definition of done checklist (cross-phase)

- Data model and migration reviewed
- API and client validation complete
- Loading/empty/error states covered
- Edit flows preserve historical integrity
- Feature flags (if partial rollout)
- Telemetry events for adoption and failure points
- Unit/integration coverage for domain logic

