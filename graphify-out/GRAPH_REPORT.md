# Graph Report - equipe  (2026-09-11)

## Corpus Check
- 134 files · ~51,943 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 628 nodes · 1129 edges · 48 communities (34 shown, 12 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Database Schema
- Motion and Sparklines
- Platform Architecture
- Development Dependencies
- Authentication and Email
- Modal Components
- App Shell Navigation
- English Messages
- French Messages
- Notification State
- Chat Interface Icons
- Project Scripts
- Package Metadata
- Forms and Passwords
- File Type UI
- Meeting Controls
- Meeting State
- TypeScript Configuration
- Admin Users
- File Sharing API
- Theme State
- User Profile
- Web App Manifest
- Team Overview UI
- ESLint Configuration
- Localization Configuration
- Icon Generation
- Runtime Dependencies
- S3 Storage Migration
- SvelteKit Adapters
- Favicon Design
- Large App Icon
- LiveKit Infrastructure
- LiveKit Server
- File Validation
- Route Protection
- Database and Storage Services
- Application Types
- Small App Icon
- Realtime API
- Drizzle Configuration
- Production Build
- Vite Localization
- Small Maskable Icon
- Large Maskable Icon
- Crawler Policy

## God Nodes (most connected - your core abstractions)
1. `@sveltejs/kit` - 26 edges
2. `drizzle-orm` - 24 edges
3. `db` - 23 edges
4. `scripts` - 19 edges
5. `teamMember` - 16 edges
6. `notificationState` - 15 edges
7. `meetingState` - 13 edges
8. `auth` - 12 edges
9. `trendWindow()` - 12 edges
10. `channel` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Equipe Architecture Description` --semantically_similar_to--> `Equipe Collaboration Platform`  [INFERRED] [semantically similar]
  CLAUDE.md → AGENTS.md
- `Cleanup-Aware File Storage Rule` --semantically_similar_to--> `Database and Blob Coordinated File Cleanup`  [INFERRED] [semantically similar]
  CLAUDE.md → AGENTS.md
- `Standalone LiveKit Server Configuration` --semantically_similar_to--> `Embedded Development LiveKit Configuration`  [INFERRED] [semantically similar]
  livekit.yaml → docker-compose.infra.yml
- `Project Scaffold Configuration` --conceptually_related_to--> `SvelteKit 2 and Svelte 5 Stack`  [INFERRED]
  README.md → AGENTS.md
- `Carbon CSS Accent Token Overrides` --conceptually_related_to--> `Carbon Design System UI`  [INFERRED]
  src/app.html → AGENTS.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Equipe Collaboration Technology Stack** — agents_equipe_platform, agents_sveltekit_svelte_stack, agents_postgresql_drizzle, agents_carbon_design_system, agents_better_auth, agents_paraglide_i18n, agents_livekit_video, agents_seaweedfs_storage [EXTRACTED 1.00]
- **Production Runtime Topology** — docker_compose_app_service, docker_compose_postgresql_service, docker_compose_seaweedfs_service, docker_compose_livekit_service [EXTRACTED 1.00]
- **Localized and Personalized Document Bootstrap** — src_app_sveltekit_document_shell, src_app_paraglide_document_locale, src_app_theme_bootstrap, src_app_accent_color_bootstrap, src_app_carbon_css_overrides [EXTRACTED 1.00]
- **Three-Person Team Group** — src_lib_assets_favicon_central_member, src_lib_assets_favicon_flanking_members, src_lib_assets_favicon_team_icon [INFERRED 0.95]
- **Three People Form a Team** — static_icons_icon_512x512_central_person, static_icons_icon_512x512_left_person, static_icons_icon_512x512_right_person [INFERRED 0.95]

## Communities (48 total, 12 thin omitted)

### Community 0 - "Database Schema"
Cohesion: 0.07
Nodes (64): RFC-5987, drizzle-orm, @sveltejs/kit, client, db, channel, file, fileShare (+56 more)

### Community 1 - "Motion and Sparklines"
Cohesion: 0.08
Nodes (21): svelte, vitest, linear, addItem(), cubicBezier(), duration, easing, ItemParams (+13 more)

### Community 2 - "Platform Architecture"
Cohesion: 0.09
Nodes (31): Better Auth Email and Password Authentication, Carbon Design System UI, Core Collaboration Database Schema, Equipe Environment Configuration, Equipe Collaboration Platform, Database and Blob Coordinated File Cleanup, LiveKit Video Meetings, Paraglide English and French Internationalization (+23 more)

### Community 3 - "Development Dependencies"
Cohesion: 0.07
Nodes (28): devDependencies, better-auth, @carbon/motion, drizzle-kit, drizzle-orm, eslint, @eslint/compat, eslint-config-prettier (+20 more)

### Community 4 - "Authentication and Email"
Cohesion: 0.11
Nodes (13): handle, auth, emailLayout(), invitationEmailHtml(), resetPasswordEmailHtml(), sendEmail(), SendEmailOptions, verificationEmailHtml() (+5 more)

### Community 5 - "Modal Components"
Cohesion: 0.13
Nodes (7): ./$types, ./$types, ./$types, ./$types, kpis, ./$types, ../../$types

### Community 6 - "App Shell Navigation"
Cohesion: 0.11
Nodes (3): displayName, initials, $app/types

### Community 7 - "English Messages"
Cohesion: 0.08
Nodes (25): hello_world, notification_new_file, notification_new_meeting, notification_new_message, $schema, share_active_downloads, share_active_expires, share_active_links (+17 more)

### Community 8 - "French Messages"
Cohesion: 0.08
Nodes (25): hello_world, notification_new_file, notification_new_meeting, notification_new_message, $schema, share_active_downloads, share_active_expires, share_active_links (+17 more)

### Community 9 - "Notification State"
Cohesion: 0.16
Nodes (7): NotificationType, notification, AppNotification, LocalToast, notificationState, TOAST_TIMEOUT, ToastKind

### Community 10 - "Chat Interface Icons"
Cohesion: 0.13
Nodes (6): connect(), fetchMissedMessages(), getLatestTimestamp(), messageOutbox, OutgoingMessage, ./$types

### Community 11 - "Project Scripts"
Cohesion: 0.11
Nodes (19): scripts, auth:schema, build, check, check:watch, db:generate, db:migrate, db:push (+11 more)

### Community 12 - "Package Metadata"
Cohesion: 0.11
Nodes (17): name, private, type, version, better-auth, carbon-components-svelte, carbon-icons-svelte, @carbon/motion (+9 more)

### Community 13 - "Forms and Passwords"
Cohesion: 0.15
Nodes (9): failureMessage(), feedbackEnhance(), FeedbackOptions, GENERIC_ERROR, ./$types, ./$types, ./$types, ./$types (+1 more)

### Community 17 - "TypeScript Configuration"
Cohesion: 0.14
Nodes (13): ./.svelte-kit/tsconfig.json, compilerOptions, allowJs, checkJs, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution, resolveJsonModule (+5 more)

### Community 18 - "Admin Users"
Cohesion: 0.20
Nodes (9): isAdmin(), account, session, user, verification, actions, load(), load() (+1 more)

### Community 19 - "File Sharing API"
Cohesion: 0.31
Nodes (10): listActiveShares(), ShareDuration, shareParams(), DELETE(), DURATIONS, fileForMember(), GET(), POST() (+2 more)

### Community 20 - "Theme State"
Cohesion: 0.22
Nodes (5): ACCENT_TOKENS, accentOptions, CarbonTheme, themeOptions, themeState

### Community 21 - "User Profile"
Cohesion: 0.22
Nodes (8): confirmPassword, currentPassword, initials, newPassword, passwordPending, passwordReady, string, ./$types

### Community 22 - "Web App Manifest"
Cohesion: 0.22
Nodes (8): background_color, description, display, icons, name, short_name, start_url, theme_color

### Community 24 - "ESLint Configuration"
Cohesion: 0.25
Nodes (7): gitignorePath, @eslint/compat, eslint-config-prettier, @eslint/js, eslint-plugin-svelte, globals, typescript-eslint

### Community 25 - "Localization Configuration"
Cohesion: 0.29
Nodes (6): baseLocale, locales, modules, plugin.inlang.messageFormat, pathPattern, $schema

### Community 26 - "Icon Generation"
Cohesion: 0.29
Nodes (6): sharp, __dirname, outDir, sizes, svgBuffer, svgPath

### Community 27 - "Runtime Dependencies"
Cohesion: 0.33
Nodes (6): dependencies, @aws-sdk/client-s3, carbon-components-svelte, carbon-icons-svelte, livekit-client, livekit-server-sdk

### Community 28 - "S3 Storage Migration"
Cohesion: 0.33
Nodes (5): @aws-sdk/client-s3, postgres, dryRun, s3, sql

### Community 29 - "SvelteKit Adapters"
Cohesion: 0.40
Nodes (3): @sveltejs/adapter-auto, @sveltejs/adapter-node, config

### Community 30 - "Favicon Design"
Cohesion: 0.50
Nodes (5): 24 Pixel Square Canvas, Blue Brand Color, Central Team Member, Flanking Team Members, Equipe Team Favicon

### Community 31 - "Large App Icon"
Cohesion: 0.40
Nodes (5): Central Person, Left Person, Right Person, Team Collaboration, Team Icon

### Community 32 - "LiveKit Infrastructure"
Cohesion: 0.50
Nodes (4): Embedded Development LiveKit Configuration, Development LiveKit Service, LiveKit RTC TCP and UDP Ports, Standalone LiveKit Server Configuration

### Community 33 - "LiveKit Server"
Cohesion: 0.50
Nodes (3): livekit-server-sdk, createRoomToken(), load()

### Community 34 - "File Validation"
Cohesion: 0.67
Nodes (3): formatSize(), MAX_UPLOAD_BYTES, validateUpload()

### Community 35 - "Route Protection"
Cohesion: 0.67
Nodes (3): Authentication Route Group, Request-Local Authentication Session, Protected App Route Group

### Community 36 - "Database and Storage Services"
Cohesion: 0.67
Nodes (3): Development Persistent Data Volumes, Development PostgreSQL Service, Development SeaweedFS Service

### Community 38 - "Small App Icon"
Cohesion: 0.67
Nodes (3): Equipe Application Icon, Team Collaboration, Three-Person Group Symbol

## Knowledge Gaps
- **246 isolated node(s):** `gitignorePath`, `$schema`, `hello_world`, `notification_new_message`, `notification_new_file` (+241 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 330 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@sveltejs/kit` connect `Database Schema` to `Authentication and Email`, `Package Metadata`, `Forms and Passwords`, `Admin Users`, `File Sharing API`?**
  _High betweenness centrality (0.196) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Development Dependencies` to `Package Metadata`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `drizzle-orm` connect `Database Schema` to `Motion and Sparklines`, `Authentication and Email`, `Package Metadata`, `Admin Users`, `File Sharing API`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **What connects `gitignorePath`, `$schema`, `hello_world` to the rest of the system?**
  _246 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Database Schema` be split into smaller, more focused modules?**
  _Cohesion score 0.0664843256890385 - nodes in this community are weakly interconnected._
- **Should `Motion and Sparklines` be split into smaller, more focused modules?**
  _Cohesion score 0.08199643493761141 - nodes in this community are weakly interconnected._
- **Should `Platform Architecture` be split into smaller, more focused modules?**
  _Cohesion score 0.08602150537634409 - nodes in this community are weakly interconnected._