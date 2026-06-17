# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [2.7.0](https://github.com/klbsjpolp/skip-bo/compare/v2.6.1...v2.7.0) (2026-06-17)


### Features

* **web:** warm ivory cinema theme and clearer F1 card edges ([8545b46](https://github.com/klbsjpolp/skip-bo/commit/8545b46e058e9baa9ce1895e07142164af06c6cd))


### Bug Fixes

* **web:** adjust dialog close button size for consistency and alignment ([331049f](https://github.com/klbsjpolp/skip-bo/commit/331049f2010b8f6ce8e3191862d0c5edc643e629))
* **web:** align dialog close button size and update theme-specific styles ([c948a48](https://github.com/klbsjpolp/skip-bo/commit/c948a4865de92cc1301b2b526d4b8351b5afe23d))
* **web:** format f1.css and refresh F1 + switcher visual baselines ([914af18](https://github.com/klbsjpolp/skip-bo/commit/914af188366bf0ef8f46ebc6f48fb47233f8a216))

## [2.6.1](https://github.com/klbsjpolp/skip-bo/compare/v2.6.0...v2.6.1) (2026-06-15)

## [2.6.0](https://github.com/klbsjpolp/skip-bo/compare/v2.5.1...v2.6.0) (2026-06-15)


### Features

* **web:** add Formule 1 theme ([710af7b](https://github.com/klbsjpolp/skip-bo/commit/710af7bbdc5d154e4f374953398f3cc5dff87deb))


### Bug Fixes

* **web:** keep pre-completion backdrop until completing play lands ([ebc3cbd](https://github.com/klbsjpolp/skip-bo/commit/ebc3cbde17440cd9b02d8d93ab6794e59e30367f))

## [2.5.1](https://github.com/klbsjpolp/skip-bo/compare/v2.5.0...v2.5.1) (2026-06-14)


### Bug Fixes

* **web:** record theme usage as standalone spans with real duration ([e057892](https://github.com/klbsjpolp/skip-bo/commit/e057892ce80f8f28e60e9356fca048eb62e086a3))

## [2.5.0](https://github.com/klbsjpolp/skip-bo/compare/v2.4.0...v2.5.0) (2026-06-14)


### Features

* **web:** track per-theme usage time via Sentry spans ([734494a](https://github.com/klbsjpolp/skip-bo/commit/734494ad50c53d1637982c10f19f5133d0fa1f7b))

## [2.4.0](https://github.com/klbsjpolp/skip-bo/compare/v2.3.0...v2.4.0) (2026-06-13)


### Features

* **web:** auto-apply pending PWA update on launch in local mode ([4706a3d](https://github.com/klbsjpolp/skip-bo/commit/4706a3dc0b3b55f9d8e8ca4b7a163838a266aa69))

## [2.3.0](https://github.com/klbsjpolp/skip-bo/compare/v2.2.0...v2.3.0) (2026-06-13)


### Features

* **theme-cinema:** camera empty-card icon and turn cue mark ([eb38f20](https://github.com/klbsjpolp/skip-bo/commit/eb38f201864e95916b8abe8f2ea6fc908d851ab9))

## [2.2.0](https://github.com/klbsjpolp/skip-bo/compare/v2.1.1...v2.2.0) (2026-06-13)


### Features

* **web:** add Nouveau badge for cinema theme in switcher ([d63915d](https://github.com/klbsjpolp/skip-bo/commit/d63915d7d7c7334a9b071fe0f13bab47d531c326))


### Bug Fixes

* **deps:** bump tmp override to >=0.2.6 (CVE-2026-44705) ([d2f2cf7](https://github.com/klbsjpolp/skip-bo/commit/d2f2cf75ddec05b75c08f2bd25edae44119a5b2c))

## [2.1.1](https://github.com/klbsjpolp/skip-bo/compare/v2.1.0...v2.1.1) (2026-06-13)


### Bug Fixes

* **game-core:** consolidate refill/validation logic, fix README drift ([27ea5ad](https://github.com/klbsjpolp/skip-bo/commit/27ea5ad51e85beed105eb4c3cee4452d8a3f9ffa))

## [2.1.0](https://github.com/klbsjpolp/skip-bo/compare/v2.0.2...v2.1.0) (2026-06-13)


### Features

* **web:** academy-leader countdown faces for cinema cards ([5aea84f](https://github.com/klbsjpolp/skip-bo/commit/5aea84fe07d323933d1c949b89efb4aef6795fcc))
* **web:** add Cinéma muet silent-film monochrome theme ([ce2eae5](https://github.com/klbsjpolp/skip-bo/commit/ce2eae57e32d4b0141d63399fbe5c64d445008b2))
* **web:** add swaying searchlights to the cinema theme ([faca7dc](https://github.com/klbsjpolp/skip-bo/commit/faca7dcdf45c8664adf96600eca06f246f54e7fc))
* **web:** skip-bo as a countdown-at-zero card in cinema theme ([5d6ed9e](https://github.com/klbsjpolp/skip-bo/commit/5d6ed9e1d397db44886e727011b3908c49e9f76c))
* **web:** skip-bo printed in nitrate like the numbered cards ([c4c8033](https://github.com/klbsjpolp/skip-bo/commit/c4c803320bd9d7e34ea641982dccb6cbe07da80a))

## [2.0.2](https://github.com/klbsjpolp/skip-bo/compare/v2.0.1...v2.0.2) (2026-06-07)

## [2.0.1](https://github.com/klbsjpolp/skip-bo/compare/v2.0.0...v2.0.1) (2026-06-07)

## [2.0.0](https://github.com/klbsjpolp/skip-bo/compare/v1.43.7...v2.0.0) (2026-06-05)


### ⚠ BREAKING CHANGES

* PROTOCOL_VERSION is 2. Operators must bump the
PWA_MINIMUM_SUPPORTED_VERSION repo variable at deploy so v1 PWA clients hard-update;
v1 clients are otherwise rejected at auth (HTTP 426).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
* **web:** requires the relay server (PROTOCOL_VERSION 2).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
* **realtime-api:** the WebSocket protocol is replaced (relay/setTurn/snapshot/endGame
instead of action/snapshot). PROTOCOL_VERSION is 2; v1 clients are rejected at auth.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>

* **realtime-api:** rewrite server as a game-agnostic relay ([4d21bfa](https://github.com/klbsjpolp/skip-bo/commit/4d21bfacaae47133aade2bd4c2ab546064e00dbc))
* remove multiplayer-protocol; retarget tooling and docs to the relay model ([0c647b8](https://github.com/klbsjpolp/skip-bo/commit/0c647b88a925076fcbc2ce90aee49e6da07dd3ca))
* **web:** host-authoritative online client ([0ef74a5](https://github.com/klbsjpolp/skip-bo/commit/0ef74a53616360ccd247e2a97a7456cc8c719d2e))


### Features

* **realtime-core:** add game-agnostic relay protocol package ([5d3f1bd](https://github.com/klbsjpolp/skip-bo/commit/5d3f1bd26a3748f3df3ccf0e5fbe2c9163c4d7ce))
* **skipbo-runtime:** add host-authoritative Skip-Bo runtime ([ef8c9dd](https://github.com/klbsjpolp/skip-bo/commit/ef8c9dd2efe2e1538f509bab603af7ec223b8e5b))


### Bug Fixes

* **web:** delay next-player draw until the local discard animation ends ([a62f206](https://github.com/klbsjpolp/skip-bo/commit/a62f206fa9a7a7e2187ac92c9878585e7ea4fb82))

## [1.43.7](https://github.com/klbsjpolp/skip-bo/compare/v1.43.6...v1.43.7) (2026-06-05)


### Bug Fixes

* **neon:** seamless background grid loop ([ce9d150](https://github.com/klbsjpolp/skip-bo/commit/ce9d150a06aadd88b0b940c2380bcd4361e199d8))

## [1.43.6](https://github.com/klbsjpolp/skip-bo/compare/v1.43.5...v1.43.6) (2026-05-31)

## [1.43.5](https://github.com/klbsjpolp/skip-bo/compare/v1.43.4...v1.43.5) (2026-05-31)

## [1.43.4](https://github.com/klbsjpolp/skip-bo/compare/v1.43.3...v1.43.4) (2026-05-31)


### Bug Fixes

* **web:** reset neon stock glow by remounting card on value change ([3850369](https://github.com/klbsjpolp/skip-bo/commit/38503694f38b17081d310543ae2b7178919c0d8b))

## [1.43.3](https://github.com/klbsjpolp/skip-bo/compare/v1.43.2...v1.43.3) (2026-05-30)


### Bug Fixes

* **coverage:** drop invalid all:true coverage option ([786eca1](https://github.com/klbsjpolp/skip-bo/commit/786eca18b9741b4ecaf410f3fa1d636cf076ab3c))

## [1.43.2](https://github.com/klbsjpolp/skip-bo/compare/v1.43.1...v1.43.2) (2026-05-30)


### Bug Fixes

* **web:** don't block local New Game when soft update can't apply ([917be55](https://github.com/klbsjpolp/skip-bo/commit/917be5520475c1cd8b25b300aba4ca5efef0aa17))
* **web:** harden PWA auto-update for local games and victory screens ([559e2cf](https://github.com/klbsjpolp/skip-bo/commit/559e2cfd2476e983056a12573f23cb136e1be6b5))

## [1.43.1](https://github.com/klbsjpolp/skip-bo/compare/v1.43.0...v1.43.1) (2026-05-29)

## [1.43.0](https://github.com/klbsjpolp/skip-bo/compare/v1.42.0...v1.43.0) (2026-05-29)


### Features

* **web:** apply PWA updates automatically at safe moments ([f872938](https://github.com/klbsjpolp/skip-bo/commit/f87293851c380c5f5ab97c42123bf5cc38509ec5))


### Bug Fixes

* **web:** show version dot when update is pending, not when idle ([f860aa6](https://github.com/klbsjpolp/skip-bo/commit/f860aa6942803415227c78ec2d66827a5095cd7e))

## [1.42.0](https://github.com/klbsjpolp/skip-bo/compare/v1.41.0...v1.42.0) (2026-05-29)


### Features

* add clear stock pile debug buttons ([c5adb02](https://github.com/klbsjpolp/skip-bo/commit/c5adb02d5c39c7b70d1ed6c650f80b2c9646699c))

## [1.41.0](https://github.com/klbsjpolp/skip-bo/compare/v1.40.2...v1.41.0) (2026-05-28)


### Features

* **game-core:** introduce selectors layer ([9bf9d7c](https://github.com/klbsjpolp/skip-bo/commit/9bf9d7c949292d7f568ca98a80aca9069bd5caae))
* **protocol:** introduce explicit PROTOCOL_VERSION handshake ([4cab8f3](https://github.com/klbsjpolp/skip-bo/commit/4cab8f3c6ab22f214ee95420e8d57e7d6aef867e))


### Bug Fixes

* **protocol:** make version gate enforceable when MIN bumps past 1 ([14e5f30](https://github.com/klbsjpolp/skip-bo/commit/14e5f303f6b27dc0af6101cc445d63a61d9094bd))

## [1.40.2](https://github.com/klbsjpolp/skip-bo/compare/v1.40.1...v1.40.2) (2026-05-28)


### Bug Fixes

* **web:** hug discard-pile-stack height to its top card ([bd7c6e0](https://github.com/klbsjpolp/skip-bo/commit/bd7c6e08254f2752db8fd6020c6468d287cbb95e))

## [1.40.1](https://github.com/klbsjpolp/skip-bo/compare/v1.40.0...v1.40.1) (2026-05-26)


### Bug Fixes

* **card:** show buried corner number when top of pile is a Skip-Bo ([48b76b6](https://github.com/klbsjpolp/skip-bo/commit/48b76b6bf1768c8fef7193bd0300e5538b9264fe))
* **theme-metro:** keep Skip-Bo visible when stacked under numbered cards ([e53c064](https://github.com/klbsjpolp/skip-bo/commit/e53c0648e4beec26b9d9b490d87563f22d9c0079))
* **theme-metro:** show Skip-Bo card on top of discard piles ([037e896](https://github.com/klbsjpolp/skip-bo/commit/037e896af6ebffcfc66c0269ae5de20364a379a4))
* **theme-metro:** use default stacked-card layout on discard piles ([7fba249](https://github.com/klbsjpolp/skip-bo/commit/7fba24982300d5d8c425c3abc5046f310854bdde))

## [1.40.0](https://github.com/klbsjpolp/skip-bo/compare/v1.39.0...v1.40.0) (2026-05-25)


### Features

* **wool:** update card group color and refine selected border style ([62b9734](https://github.com/klbsjpolp/skip-bo/commit/62b973409dc9038e65f0bca9bd6e5b10788cbd54))

## [1.39.0](https://github.com/klbsjpolp/skip-bo/compare/v1.38.0...v1.39.0) (2026-05-25)


### Features

* **debug:** add button to fill hand with Skip-Bo cards ([61da895](https://github.com/klbsjpolp/skip-bo/commit/61da89583f178cf5b49fcb2e7bbf833718445ceb))


### Bug Fixes

* **drag:** allow dragging Skip-Bo wildcard onto discard piles ([6ff94cb](https://github.com/klbsjpolp/skip-bo/commit/6ff94cbdf430727f345316b7c65ef19adb13dc2b))
* **release:** drop explicit conventionalcommits preset ([b526c8d](https://github.com/klbsjpolp/skip-bo/commit/b526c8d7a29da9ee511aac4204bdabf40bc1863d))

# [1.38.0](https://github.com/klbsjpolp/skip-bo/compare/v1.37.9...v1.38.0) (2026-05-23)


### Features

* **glass:** engrave card numbers and stabilize backdrop blur ([1b2f6de](https://github.com/klbsjpolp/skip-bo/commit/1b2f6deb1774f91cb7a8c5e076b93f0289091b1f))



## [1.37.9](https://github.com/klbsjpolp/skip-bo/compare/v1.37.8...v1.37.9) (2026-05-23)


### Bug Fixes

* **theme:** make active-player ring visible in wool theme ([c7c5c65](https://github.com/klbsjpolp/skip-bo/commit/c7c5c658158c87674e5e63edebfad0bebf9673e4)), closes [#c9c9c9](https://github.com/klbsjpolp/skip-bo/issues/c9c9c9)



## [1.37.8](https://github.com/klbsjpolp/skip-bo/compare/v1.37.7...v1.37.8) (2026-05-23)


### Bug Fixes

* **web:** land discard animation on empty pile placeholder center ([298bb60](https://github.com/klbsjpolp/skip-bo/commit/298bb603ec1ea2edd35c042d9743011589d6c86a))



## [1.37.7](https://github.com/klbsjpolp/skip-bo/compare/v1.37.6...v1.37.7) (2026-05-23)



## [1.37.6](https://github.com/klbsjpolp/skip-bo/compare/v1.37.5...v1.37.6) (2026-05-22)



## [1.37.5](https://github.com/klbsjpolp/skip-bo/compare/v1.37.4...v1.37.5) (2026-05-22)



## [1.37.4](https://github.com/klbsjpolp/skip-bo/compare/v1.37.3...v1.37.4) (2026-05-22)


### Bug Fixes

* **web:** batch opponent animations to remove play/completion race ([64f96d5](https://github.com/klbsjpolp/skip-bo/commit/64f96d5d8569a101f68443829f2aa3dc1e64cfa3))



## [1.37.3](https://github.com/klbsjpolp/skip-bo/compare/v1.37.2...v1.37.3) (2026-05-21)



## [1.37.2](https://github.com/klbsjpolp/skip-bo/compare/v1.37.1...v1.37.2) (2026-05-20)


### Bug Fixes

* **web:** mask just-completed 12 on retreat pile during play animation ([d922088](https://github.com/klbsjpolp/skip-bo/commit/d9220889f664b3fc20a2cecb0ddaa3845678b061))



## [1.37.1](https://github.com/klbsjpolp/skip-bo/compare/v1.37.0...v1.37.1) (2026-05-20)


### Bug Fixes

* **web:** keep deck back visible during staggered draw animations ([c6ac3b9](https://github.com/klbsjpolp/skip-bo/commit/c6ac3b98fba9e3cc0e864d2a67fb00f635a53bc9))



# [1.37.0](https://github.com/klbsjpolp/skip-bo/compare/v1.36.3...v1.37.0) (2026-05-18)


### Features

* **settings:** add new Bash commands to settings.json ([2514bf6](https://github.com/klbsjpolp/skip-bo/commit/2514bf614ae2e3e24e6b87f4b40d8135c6f19e44))



## [1.36.3](https://github.com/klbsjpolp/skip-bo/compare/v1.36.2...v1.36.3) (2026-05-18)


### Bug Fixes

* **web:** guard drag swallow-timer against jsdom teardown ([585785f](https://github.com/klbsjpolp/skip-bo/commit/585785f1070aee5546b34552313a75c9b4248577))



## [1.36.2](https://github.com/klbsjpolp/skip-bo/compare/v1.36.1...v1.36.2) (2026-05-18)



## [1.36.1](https://github.com/klbsjpolp/skip-bo/compare/v1.36.0...v1.36.1) (2026-05-18)



# [1.36.0](https://github.com/klbsjpolp/skip-bo/compare/v1.35.0...v1.36.0) (2026-05-18)


### Features

* **css:** simplify card corner styling and hover states in metro theme ([0b88053](https://github.com/klbsjpolp/skip-bo/commit/0b88053fc68ed3d5e49bd1c51d8f542a99890f90))



# [1.35.0](https://github.com/klbsjpolp/skip-bo/compare/v1.34.0...v1.35.0) (2026-05-18)


### Features

* **game-core:** allow discarding Skip-Bo cards per official rules ([3e1921e](https://github.com/klbsjpolp/skip-bo/commit/3e1921e6ab03ebc269638be1c1b6d7142e1fff73))



# [1.34.0](https://github.com/klbsjpolp/skip-bo/compare/v1.33.9...v1.34.0) (2026-05-17)


### Features

* **web:** add countdown-dot progress ladder to retro-space cards ([5c64e95](https://github.com/klbsjpolp/skip-bo/commit/5c64e9563bb22524639d6fa96639b88ff374360a))



## [1.33.9](https://github.com/klbsjpolp/skip-bo/compare/v1.33.8...v1.33.9) (2026-05-17)



## [1.33.8](https://github.com/klbsjpolp/skip-bo/compare/v1.33.7...v1.33.8) (2026-05-17)


### Bug Fixes

* **web:** allow drag-and-drop on unselected cards in multiplayer ([e03978e](https://github.com/klbsjpolp/skip-bo/commit/e03978eda422ef014dd37d78570cc4bc81b712a3))



## [1.33.7](https://github.com/klbsjpolp/skip-bo/compare/v1.33.6...v1.33.7) (2026-05-17)


### Bug Fixes

* **retro-space:** fix rocket SVG geometry to match original CSS shape ([fde176c](https://github.com/klbsjpolp/skip-bo/commit/fde176c476946001d8fcea00bfb27b378d18b0dd))
* **web:** use CSSProperties cast for --card-rotate inline style ([f02ed6a](https://github.com/klbsjpolp/skip-bo/commit/f02ed6aa6e172c1e6cb1d7271148d32767e02e6f))



## [1.33.6](https://github.com/klbsjpolp/skip-bo/compare/v1.33.5...v1.33.6) (2026-05-16)



## [1.33.5](https://github.com/klbsjpolp/skip-bo/compare/v1.33.4...v1.33.5) (2026-05-16)



## [1.33.4](https://github.com/klbsjpolp/skip-bo/compare/v1.33.3...v1.33.4) (2026-05-16)



## [1.33.3](https://github.com/klbsjpolp/skip-bo/compare/v1.33.2...v1.33.3) (2026-05-16)



## [1.33.2](https://github.com/klbsjpolp/skip-bo/compare/v1.33.1...v1.33.2) (2026-05-16)



## [1.33.1](https://github.com/klbsjpolp/skip-bo/compare/v1.33.0...v1.33.1) (2026-05-16)



# [1.33.0](https://github.com/klbsjpolp/skip-bo/compare/v1.32.11...v1.33.0) (2026-05-16)


### Features

* **theme:** rework rainbow theme with stormy back and gradients ([421f1be](https://github.com/klbsjpolp/skip-bo/commit/421f1be2a4936376c620e71b915a65074f096c92))



## [1.32.11](https://github.com/klbsjpolp/skip-bo/compare/v1.32.10...v1.32.11) (2026-05-16)



## [1.32.10](https://github.com/klbsjpolp/skip-bo/compare/v1.32.9...v1.32.10) (2026-05-16)



## [1.32.9](https://github.com/klbsjpolp/skip-bo/compare/v1.32.8...v1.32.9) (2026-05-15)



## [1.32.8](https://github.com/klbsjpolp/skip-bo/compare/v1.32.7...v1.32.8) (2026-05-15)



## [1.32.7](https://github.com/klbsjpolp/skip-bo/compare/v1.32.6...v1.32.7) (2026-05-15)



## [1.32.6](https://github.com/klbsjpolp/skip-bo/compare/v1.32.5...v1.32.6) (2026-05-15)


### Bug Fixes

* **web:** ensure synchronous face swap during card flip transition ([caf56cd](https://github.com/klbsjpolp/skip-bo/commit/caf56cd61792d51a8d49fa6c0a99672ac7d73b68))



## [1.32.5](https://github.com/klbsjpolp/skip-bo/compare/v1.32.4...v1.32.5) (2026-05-13)



## [1.32.4](https://github.com/klbsjpolp/skip-bo/compare/v1.32.3...v1.32.4) (2026-05-09)



## [1.32.3](https://github.com/klbsjpolp/skip-bo/compare/v1.32.2...v1.32.3) (2026-05-09)


### Reverts

* drop Sentry boot test message ([03030bf](https://github.com/klbsjpolp/skip-bo/commit/03030bfddd48f06453568430d011f0b213392604))



## [1.32.2](https://github.com/klbsjpolp/skip-bo/compare/v1.32.1...v1.32.2) (2026-05-09)



## [1.32.1](https://github.com/klbsjpolp/skip-bo/compare/v1.32.0...v1.32.1) (2026-05-09)



# [1.32.0](https://github.com/klbsjpolp/skip-bo/compare/v1.31.7...v1.32.0) (2026-05-09)


### Bug Fixes

* **web:** pass actorRef to `useSkipBoGame` and hide pile label for cards ([637447f](https://github.com/klbsjpolp/skip-bo/commit/637447ff9844378b2bb261478299ebea873ce214))
* **web:** restore actorRef to selectCard useCallback deps ([55e4fcd](https://github.com/klbsjpolp/skip-bo/commit/55e4fcd4b1f09311f9dc0c4f13410b8ae5873a85))
* **web:** sync stateRef to handle synchronous card actions properly ([225587b](https://github.com/klbsjpolp/skip-bo/commit/225587ba0d448e7f519b340a2e200513fd8329d9))


### Features

* **web:** implement drag-and-drop with animated card transitions ([5dbea45](https://github.com/klbsjpolp/skip-bo/commit/5dbea459829bbe728d5282c84d74079bf7b36097))



## [1.31.7](https://github.com/klbsjpolp/skip-bo/compare/v1.31.6...v1.31.7) (2026-05-08)


### Bug Fixes

* **ui:** preserve safe-area gutters when Radix portals lock scroll ([38b9284](https://github.com/klbsjpolp/skip-bo/commit/38b92846a30689cb4e34dd17bbbecddf6b5f927b))



## [1.31.6](https://github.com/klbsjpolp/skip-bo/compare/v1.31.5...v1.31.6) (2026-05-08)


### Bug Fixes

* **lint:** scope animationDuration to its only use site ([345a91c](https://github.com/klbsjpolp/skip-bo/commit/345a91c8b6c00ee3bad520f8164431eab4c20f84))



## [1.31.5](https://github.com/klbsjpolp/skip-bo/compare/v1.31.4...v1.31.5) (2026-05-08)



## [1.31.4](https://github.com/klbsjpolp/skip-bo/compare/v1.31.3...v1.31.4) (2026-05-08)



## [1.31.3](https://github.com/klbsjpolp/skip-bo/compare/v1.31.2...v1.31.3) (2026-05-08)



## [1.31.2](https://github.com/klbsjpolp/skip-bo/compare/v1.31.1...v1.31.2) (2026-05-08)



## [1.31.1](https://github.com/klbsjpolp/skip-bo/compare/v1.31.0...v1.31.1) (2026-05-08)



# [1.31.0](https://github.com/klbsjpolp/skip-bo/compare/v1.30.6...v1.31.0) (2026-05-06)


### Features

* **origami:** add group-specific clip-paths for confetti bursts ([77caa71](https://github.com/klbsjpolp/skip-bo/commit/77caa71a8f72f3d1351b13abf4dc503c60146b64))



## [1.30.6](https://github.com/klbsjpolp/skip-bo/compare/v1.30.5...v1.30.6) (2026-05-06)


### Bug Fixes

* **pwa:** switch SW registration from autoUpdate to prompt ([7e348a3](https://github.com/klbsjpolp/skip-bo/commit/7e348a3664bd4f259a1d69df8a8d5ca8e7286e23))



## [1.30.5](https://github.com/klbsjpolp/skip-bo/compare/v1.30.4...v1.30.5) (2026-05-05)



## [1.30.4](https://github.com/klbsjpolp/skip-bo/compare/v1.30.3...v1.30.4) (2026-05-05)


### Bug Fixes

* **deps:** upgrade eslint 10, typescript 6, typescript-eslint 8.59 ([b0e35d6](https://github.com/klbsjpolp/skip-bo/commit/b0e35d64c1ce7f6f088bee76e9b14585593af0c4))



## [1.30.3](https://github.com/klbsjpolp/skip-bo/compare/v1.30.2...v1.30.3) (2026-05-05)


### Bug Fixes

* **lint:** avoid unused-directive error on [@typescript-eslint](https://github.com/typescript-eslint) 8.57 ([f8ac2f0](https://github.com/klbsjpolp/skip-bo/commit/f8ac2f0714ab5279736684a7b64a07807cd01ff1))
* **lint:** remove type assertions flagged by [@typescript-eslint](https://github.com/typescript-eslint) 8.59 ([418d0b1](https://github.com/klbsjpolp/skip-bo/commit/418d0b1aa6715d5bafc711ffaafa8e9e3345e2d8))



## [1.30.2](https://github.com/klbsjpolp/skip-bo/compare/v1.30.1...v1.30.2) (2026-05-05)



## [1.30.1](https://github.com/klbsjpolp/skip-bo/compare/v1.30.0...v1.30.1) (2026-05-05)



# [1.30.0](https://github.com/klbsjpolp/skip-bo/compare/v1.29.7...v1.30.0) (2026-05-05)


### Bug Fixes

* **theme/paper:** make paper sheet layers scroll as one ([dbfb4e7](https://github.com/klbsjpolp/skip-bo/commit/dbfb4e7355001e493caace1808255f5ecd74b000))
* **web:** animate refilled slot when opponent empties hand online ([29ad4fc](https://github.com/klbsjpolp/skip-bo/commit/29ad4fc3575e15952a535843c39e985ae01e7aed))
* **web:** mask retreat pile during opponent build-pile completion ([dbd4973](https://github.com/klbsjpolp/skip-bo/commit/dbd4973b16f2585431c1d7cdbed849baecc180ff))


### Features

* **themes/origami:** smooth tint via color-mix on data-value ([2cb61e6](https://github.com/klbsjpolp/skip-bo/commit/2cb61e645202e472087583252525ce55ac4cc08c))
* **themes:** replace pastel with origami theme ([4a6c738](https://github.com/klbsjpolp/skip-bo/commit/4a6c73806011e7dae95ddf30b67f386908b57c65))



## [1.29.7](https://github.com/klbsjpolp/skip-bo/compare/v1.29.6...v1.29.7) (2026-05-03)



## [1.29.6](https://github.com/klbsjpolp/skip-bo/compare/v1.29.5...v1.29.6) (2026-05-03)



## [1.29.5](https://github.com/klbsjpolp/skip-bo/compare/v1.29.4...v1.29.5) (2026-05-02)


### Bug Fixes

* **themes:** adjust card number alignment in paper theme ([22f685b](https://github.com/klbsjpolp/skip-bo/commit/22f685b39a7cdcbbfb96fce9bee254371fb0f88a))



## [1.29.4](https://github.com/klbsjpolp/skip-bo/compare/v1.29.3...v1.29.4) (2026-05-02)



## [1.29.3](https://github.com/klbsjpolp/skip-bo/compare/v1.29.2...v1.29.3) (2026-05-02)



## [1.29.2](https://github.com/klbsjpolp/skip-bo/compare/v1.29.1...v1.29.2) (2026-05-02)



## [1.29.1](https://github.com/klbsjpolp/skip-bo/compare/v1.29.0...v1.29.1) (2026-05-02)



# [1.29.0](https://github.com/klbsjpolp/skip-bo/compare/v1.28.2...v1.29.0) (2026-05-02)


### Features

* **themes:** replace "light" theme with redesigned "paper" theme ([beb3ac0](https://github.com/klbsjpolp/skip-bo/commit/beb3ac072d2047a170e4655e5ff211b0f33f035e))



## [1.28.2](https://github.com/klbsjpolp/skip-bo/compare/v1.28.1...v1.28.2) (2026-05-02)



## [1.28.1](https://github.com/klbsjpolp/skip-bo/compare/v1.28.0...v1.28.1) (2026-05-02)



# [1.28.0](https://github.com/klbsjpolp/skip-bo/compare/v1.27.1...v1.28.0) (2026-05-02)


### Features

* **settings:** add commit command skills to allowed Bash actions ([84fa417](https://github.com/klbsjpolp/skip-bo/commit/84fa41710e3068ae72ac6ee295fc62c2cdc7376a))
* **themes:** refine midnight card back ([1a2a74d](https://github.com/klbsjpolp/skip-bo/commit/1a2a74d8e3e7bbaf7f26b395ebe37df1c2e63e33))
* **themes:** triple star density in midnight body background ([a7c7e50](https://github.com/klbsjpolp/skip-bo/commit/a7c7e5067837b6fa11ce9a2ed835e189b91ecf9c))



## [1.27.1](https://github.com/klbsjpolp/skip-bo/compare/v1.27.0...v1.27.1) (2026-05-01)



# [1.27.0](https://github.com/klbsjpolp/skip-bo/compare/v1.26.3...v1.27.0) (2026-05-01)


### Features

* **animations:** decouple card actions from animations ([102851a](https://github.com/klbsjpolp/skip-bo/commit/102851ae2ffe4d3622034ffc0ed358027a6566b9))



## [1.26.3](https://github.com/klbsjpolp/skip-bo/compare/v1.26.2...v1.26.3) (2026-05-01)



## [1.26.2](https://github.com/klbsjpolp/skip-bo/compare/v1.26.1...v1.26.2) (2026-05-01)


### Bug Fixes

* **web:** stop card layout shifts on theme/dropdown changes ([7453350](https://github.com/klbsjpolp/skip-bo/commit/74533503256cf3af80967ebe601c604b8e72911a))



## [1.26.1](https://github.com/klbsjpolp/skip-bo/compare/v1.26.0...v1.26.1) (2026-05-01)


### Bug Fixes

* **web:** replace green with indigo on Skip-Bo cards and card backs ([0093a83](https://github.com/klbsjpolp/skip-bo/commit/0093a839654a9897cee2975f5c779d9c77a361ee)), closes [#4f46e5](https://github.com/klbsjpolp/skip-bo/issues/4f46e5)



# [1.26.0](https://github.com/klbsjpolp/skip-bo/compare/v1.25.0...v1.26.0) (2026-04-29)


### Bug Fixes

* **web:** keep body background-color solid on themed pages ([29735b1](https://github.com/klbsjpolp/skip-bo/commit/29735b185a74811ecec7992f512235e0c342e39e))


### Features

* **ci:** allow `ipconfig` command in Claude Code settings ([6250d78](https://github.com/klbsjpolp/skip-bo/commit/6250d7814492695d647a1c3bf00f84793e6d5061))



# [1.25.0](https://github.com/klbsjpolp/skip-bo/compare/v1.24.0...v1.25.0) (2026-04-29)


### Features

* **protocol:** include stock pile size in current turn indicator ([ca8466d](https://github.com/klbsjpolp/skip-bo/commit/ca8466d4cdf6863539280f615308defb05d86079))



# [1.24.0](https://github.com/klbsjpolp/skip-bo/compare/v1.23.0...v1.24.0) (2026-04-29)


### Features

* **web:** add dynamic gear icon and colors to victory burst styling ([3c2d5d3](https://github.com/klbsjpolp/skip-bo/commit/3c2d5d365fadc75ca1c73509228ff07b19161754))



# [1.23.0](https://github.com/klbsjpolp/skip-bo/compare/v1.22.1...v1.23.0) (2026-04-28)


### Features

* **ci:** add npm test and dev:api run configurations for IDE ([99928b6](https://github.com/klbsjpolp/skip-bo/commit/99928b6e97aa3a0d1757a5e0743ece290e2e1ec9))
* **ci:** allow `ps` command in Claude Code settings ([c117ee9](https://github.com/klbsjpolp/skip-bo/commit/c117ee91b28bfe3cc62ebf0437725ea557d94c3d))
* **web:** enhance steampunk theme with new textures and card effects ([c22a661](https://github.com/klbsjpolp/skip-bo/commit/c22a66133fc0f4226c97de8032ec2c4adc2048c7))



## [1.22.1](https://github.com/klbsjpolp/skip-bo/compare/v1.22.0...v1.22.1) (2026-04-28)


### Bug Fixes

* **web:** break iOS PWA splash → blank reload loop on hard updates ([57335f3](https://github.com/klbsjpolp/skip-bo/commit/57335f3a12d3c20f442d4f1d8dc04260b95b37bb))



# [1.22.0](https://github.com/klbsjpolp/skip-bo/compare/v1.21.1...v1.22.0) (2026-04-28)


### Features

* **web:** sync iOS PWA status bar color with active theme ([8d8dde9](https://github.com/klbsjpolp/skip-bo/commit/8d8dde94be39356d08cedde349af321b0661127e))



## [1.21.1](https://github.com/klbsjpolp/skip-bo/compare/v1.21.0...v1.21.1) (2026-04-28)


### Bug Fixes

* **multiplayer:** no disconnect timers or rejoin for finished games ([ee9dab8](https://github.com/klbsjpolp/skip-bo/commit/ee9dab8f2045787024254fc0516da438cff463a3))



# [1.21.0](https://github.com/klbsjpolp/skip-bo/compare/v1.20.2...v1.21.0) (2026-04-28)


### Features

* **protocol:** restrict room code to letters only ([b21def8](https://github.com/klbsjpolp/skip-bo/commit/b21def89c5b5675ad71cebf3be2e503bf4a8c948))
* **protocol:** shorten room code to 3 characters ([7626911](https://github.com/klbsjpolp/skip-bo/commit/7626911235fcad9b2999000cf07bd10a872d79ac))



## [1.20.2](https://github.com/klbsjpolp/skip-bo/compare/v1.20.1...v1.20.2) (2026-04-28)



## [1.20.1](https://github.com/klbsjpolp/skip-bo/compare/v1.20.0...v1.20.1) (2026-04-28)


### Bug Fixes

* **web:** keep top remote seat above siblings in 3+ player board ([43da645](https://github.com/klbsjpolp/skip-bo/commit/43da6458cbdc7b6d72587a5247aa8731707f49b1))
* **web:** trigger retreat animation before optimistic commit ([765b050](https://github.com/klbsjpolp/skip-bo/commit/765b050c4ec375037b78e78731c7788378ba9862))



# [1.20.0](https://github.com/klbsjpolp/skip-bo/compare/v1.19.1...v1.20.0) (2026-04-28)


### Bug Fixes

* **tests:** improve roomService test robustness and add seat validation ([171c37b](https://github.com/klbsjpolp/skip-bo/commit/171c37baf1354b4a7a369980b7b5548bf96de66a))
* **tests:** make realtime-api tests deterministic under shuffled seats ([7b5eb42](https://github.com/klbsjpolp/skip-bo/commit/7b5eb42dbe3c694218bf8c8ee6c8ef28a06fe55d))
* **tsconfig:** revert moduleResolution to bundler ([7be08cb](https://github.com/klbsjpolp/skip-bo/commit/7be08cb0aa50f5c607177ccf34c434a173f052b4))
* **web:** ensure correct view state before AI animation triggers ([13ad655](https://github.com/klbsjpolp/skip-bo/commit/13ad655f9a60fbfffdf36c15919a8da18c2087e1))
* **web:** polyfill localStorage in vitest setup for Node 22+ ([5e22b85](https://github.com/klbsjpolp/skip-bo/commit/5e22b85e88cbe752dd6c399cec4f856e389ac0f3))


### Features

* **theme:** add shooting stars background to retro-space theme ([3657102](https://github.com/klbsjpolp/skip-bo/commit/36571022813fff7209ed977dc35fa949307f3c81))



## [1.19.1](https://github.com/klbsjpolp/skip-bo/compare/v1.19.0...v1.19.1) (2026-04-27)


### Bug Fixes

* **theme:** update writing-mode in vertical-text utility for correctness ([3981ec3](https://github.com/klbsjpolp/skip-bo/commit/3981ec36171c9f0a736161c3ba655b0b39269f25))



# [1.19.0](https://github.com/klbsjpolp/skip-bo/compare/v1.18.0...v1.19.0) (2026-04-27)


### Bug Fixes

* **web:** conditionally render copy button in LobbyDialog during dev ([17be735](https://github.com/klbsjpolp/skip-bo/commit/17be735f28db1d3b5251a0a23b388db5eab537cc))
* **web:** drop manual memoization for playersBySeatIndex ([3c42721](https://github.com/klbsjpolp/skip-bo/commit/3c427214b0127c76b0b0d89250f4ce5d96926c8c))
* **web:** enhance OnlineStatusStrip with disconnected seat status ([9075bda](https://github.com/klbsjpolp/skip-bo/commit/9075bda095d5fa194d4a75bcc2f8e96608800123))


### Features

* **multiplayer:** 5-minute reconnection grace for dropped players ([16b867f](https://github.com/klbsjpolp/skip-bo/commit/16b867f92e0090fcd85b4ca81f9c0cab54755447))



# [1.18.0](https://github.com/klbsjpolp/skip-bo/compare/v1.17.1...v1.18.0) (2026-04-26)


### Features

* **theme/candy:** refine styles with hover and selection effects ([29114fa](https://github.com/klbsjpolp/skip-bo/commit/29114fa4845c02b03587d24d8c45710bc2cdc080))
* **theme/pastel:** improve typography, burst shapes, and imports ([7a8335d](https://github.com/klbsjpolp/skip-bo/commit/7a8335de65bed3d44805a3f3871d2032431319ab))
* **theme/rainbow:** add sky-time drift and align range colors ([f73f689](https://github.com/klbsjpolp/skip-bo/commit/f73f6894bf600cbf5920acaf93d71ec1eb2d922a))
* **theme/steampunk:** adjust card corner number spacing for lg screens ([e183f45](https://github.com/klbsjpolp/skip-bo/commit/e183f456da074a2845bc67e6dd597db3adddf2f0))
* **theme:** refine typography, imports, and add `steampunk` updates ([dd578b7](https://github.com/klbsjpolp/skip-bo/commit/dd578b78f1ee6f677db494c851da7826d8f56531))
* **theme:** replace all h3 with h2 for improved semantic consistency ([fabcf8c](https://github.com/klbsjpolp/skip-bo/commit/fabcf8c3d1d1cc0a8a6c319280f7eb39a69b55bb))



## [1.17.1](https://github.com/klbsjpolp/skip-bo/compare/v1.17.0...v1.17.1) (2026-04-25)



# [1.17.0](https://github.com/klbsjpolp/skip-bo/compare/v1.16.2...v1.17.0) (2026-04-25)


### Features

* **settings:** add preview_start command to Claude MCP settings ([d1deb06](https://github.com/klbsjpolp/skip-bo/commit/d1deb067dbf43d3fc7e210fe081f20ad33a7f0bb))
* **theme/minecraft:** add firework burst and ambient pixel drift ([81df208](https://github.com/klbsjpolp/skip-bo/commit/81df208acccea645253d4ccc8df460491c2989a2))
* **theme/neon:** add synthwave grid floor, card trail, VHS aberration ([98675f7](https://github.com/klbsjpolp/skip-bo/commit/98675f74db240c8a0fc368137506fbb4a077fa94))
* **theme/retro-space:** add inbound victory flyby streak ([6ffcc2d](https://github.com/klbsjpolp/skip-bo/commit/6ffcc2d5ca78aeaa67e3097b49c874071fe6d4ed))
* **theme/retro:** add CRT scanlines, fonts, slot contrast, confetti ([dd43754](https://github.com/klbsjpolp/skip-bo/commit/dd43754c7a13d85d95a0a603e7c6f729adc54818))



## [1.16.2](https://github.com/klbsjpolp/skip-bo/compare/v1.16.1...v1.16.2) (2026-04-24)



## [1.16.1](https://github.com/klbsjpolp/skip-bo/compare/v1.16.0...v1.16.1) (2026-04-24)


### Bug Fixes

* **web:** draw animation lands exactly in hand slot ([7d9c07f](https://github.com/klbsjpolp/skip-bo/commit/7d9c07f3d68ede440a6e80c9bc6f95a06bd1c175))



# [1.16.0](https://github.com/klbsjpolp/skip-bo/compare/v1.15.2...v1.16.0) (2026-04-24)


### Features

* add specialized agents, hooks, and skills for review automation ([a622a1a](https://github.com/klbsjpolp/skip-bo/commit/a622a1ab3e9874a79d940150da0e85384fab2770))



## [1.15.2](https://github.com/klbsjpolp/skip-bo/compare/v1.15.1...v1.15.2) (2026-04-23)


### Bug Fixes

* **web:** refine player area styles in Minecraft theme ([fd9e17a](https://github.com/klbsjpolp/skip-bo/commit/fd9e17a2a4ca298c8ebec2ed4d10ebaf18978a2b))



## [1.15.1](https://github.com/klbsjpolp/skip-bo/compare/v1.15.0...v1.15.1) (2026-04-23)



# [1.15.0](https://github.com/klbsjpolp/skip-bo/compare/v1.14.0...v1.15.0) (2026-04-23)


### Bug Fixes

* **playwright:** update console and game state logs for debugging ([0ade738](https://github.com/klbsjpolp/skip-bo/commit/0ade738fc7f08c8dfdb7180f95f33c8f1e20188f))
* **realtime-api:** track disconnected connections in FakeBroadcaster ([046c719](https://github.com/klbsjpolp/skip-bo/commit/046c71951990bcd9cb3a3125ba9198edcda87989))
* **web:** adjust styles and remove obsolete files for consistency ([5704784](https://github.com/klbsjpolp/skip-bo/commit/570478456b3bf2d2668487795289e1ac51db9227))
* **web:** remove obsolete lobby removal reset in `useOnlineSkipBoGame` ([a023af4](https://github.com/klbsjpolp/skip-bo/commit/a023af4d896da77922264aa853600a3cae6c91ac))


### Features

* **multiplayer:** add lobby waiting room with ready/kick/leave flow ([7234123](https://github.com/klbsjpolp/skip-bo/commit/7234123e854b6b713fb52b4efba6129a69dd90cc))



# [1.14.0](https://github.com/klbsjpolp/skip-bo/compare/v1.13.1...v1.14.0) (2026-04-22)


### Bug Fixes

* **web:** add `normal-card` class for consistent card styling ([19d5a5c](https://github.com/klbsjpolp/skip-bo/commit/19d5a5c67a10cd9e14687c35d19634b166c25dec))


### Features

* **web:** add active turn styling for player area in Minecraft theme ([bbf7e19](https://github.com/klbsjpolp/skip-bo/commit/bbf7e199bfbb1e0e6eb0ac5a7e89e21b62a74528))



## [1.13.1](https://github.com/klbsjpolp/skip-bo/compare/v1.13.0...v1.13.1) (2026-04-21)


### Bug Fixes

* **ci:** opt into Node.js 24 for actions and fix paths-filter base ref ([0d056bd](https://github.com/klbsjpolp/skip-bo/commit/0d056bd73b3167a151ddd369c0ced32f5bd3cf21))



# [1.13.0](https://github.com/klbsjpolp/skip-bo/compare/v1.12.1...v1.13.0) (2026-04-21)


### Features

* **web:** add target pile length tracking for animation masking ([e6ba2eb](https://github.com/klbsjpolp/skip-bo/commit/e6ba2eb3595f47cbc9cf59973aea72d353a6de52))



## [1.12.1](https://github.com/klbsjpolp/skip-bo/compare/v1.12.0...v1.12.1) (2026-04-21)


### Bug Fixes

* **web:** avoid online discard message flicker ([b7b0fa3](https://github.com/klbsjpolp/skip-bo/commit/b7b0fa3b08d1ac1fb14be953fa723a691518cf10))



# [1.12.0](https://github.com/klbsjpolp/skip-bo/compare/v1.11.1...v1.12.0) (2026-04-18)


### Bug Fixes

* **web:** address all review comments on WAAPI animation PR ([f537de7](https://github.com/klbsjpolp/skip-bo/commit/f537de72fea6d64307406e11f160cf3c50765c9f))


### Features

* **settings:** update permissions for Git and Bash commands ([4c3b040](https://github.com/klbsjpolp/skip-bo/commit/4c3b0406cebfba70a83d9e802d367d99ccdbf0bb))
* **web:** replace CSS transitions with WAAPI, add Skip-Bo morph ([997c4ac](https://github.com/klbsjpolp/skip-bo/commit/997c4acd35f4f4c552500864f57c9515fae0f4b0))



## [1.11.1](https://github.com/klbsjpolp/skip-bo/compare/v1.11.0...v1.11.1) (2026-04-18)


### Bug Fixes

* **deps:** add `@vitest/ui` dependency and update `pnpm-lock.yaml` ([4f31930](https://github.com/klbsjpolp/skip-bo/commit/4f31930ddd97875fd20baff43a5f06ceeadc5c8f))
* **web:** update OnlineGameBoard styles and refine room status layout ([1476961](https://github.com/klbsjpolp/skip-bo/commit/14769618a7c780205b7a8e616ccc12ee6e8b0d7b))



# [1.11.0](https://github.com/klbsjpolp/skip-bo/compare/v1.10.0...v1.11.0) (2026-04-18)


### Features

* **protocol:** use player display names in game messages ([3b9bc03](https://github.com/klbsjpolp/skip-bo/commit/3b9bc03d36db45bec7637cc9ab6fd5e6dd663190))



# [1.10.0](https://github.com/klbsjpolp/skip-bo/compare/v1.9.1...v1.10.0) (2026-04-16)


### Bug Fixes

* **web:** consolidate normal-card utility and optimize styles ([f5337de](https://github.com/klbsjpolp/skip-bo/commit/f5337dec6c5ee5f88ed22d29572cfdde6421a88f))


### Features

* **debug:** add DEBUG_WIN action and support for test scenarios ([0ad2244](https://github.com/klbsjpolp/skip-bo/commit/0ad2244b95d15f5765a1d245baa9b0babab338e5))



## [1.9.1](https://github.com/klbsjpolp/skip-bo/compare/v1.9.0...v1.9.1) (2026-04-15)


### Bug Fixes

* **web:** refine build pile animation staggering logic ([13e5ddc](https://github.com/klbsjpolp/skip-bo/commit/13e5ddcf776c2130bb2961101e4544a7eb9b05b1))



# [1.9.0](https://github.com/klbsjpolp/skip-bo/compare/v1.8.3...v1.9.0) (2026-04-13)


### Bug Fixes

* **web:** avoid useEffectEvent lint violation ([15390d6](https://github.com/klbsjpolp/skip-bo/commit/15390d6d2c514733dc71fb18fe8a21d2df96cfab))


### Features

* **web:** add PWA update gating and runtime version checks ([e78662d](https://github.com/klbsjpolp/skip-bo/commit/e78662d4ecfe086f65262acde65d49c9ae720eca))



## [1.8.3](https://github.com/klbsjpolp/skip-bo/compare/v1.8.2...v1.8.3) (2026-04-13)



## [1.8.2](https://github.com/klbsjpolp/skip-bo/compare/v1.8.1...v1.8.2) (2026-04-13)


### Bug Fixes

* **ci:** fetch full history for release versioning ([174bbc4](https://github.com/klbsjpolp/skip-bo/commit/174bbc4277e8a7f4d731462d3f5a165c0a00f620))



## 1.8.1 (2026-04-12)



# 1.8.0 (2026-04-12)


### Features

* **ai:** improve AI opponent awareness and threat evaluation ([b447fee](https://github.com/klbsjpolp/skip-bo/commit/b447fee81074108a3b6cbb1545fa25c0ae065ba2))



# 1.7.0 (2026-04-12)


### Features

* **monitoring:** refine Sentry trace propagation and configuration ([1d2a22c](https://github.com/klbsjpolp/skip-bo/commit/1d2a22cc272d488e5716e8ae23161857b69419e7))



## 1.6.1 (2026-04-11)


### Bug Fixes

* **web:** sequence retreat pile completion animation ([4d28dba](https://github.com/klbsjpolp/skip-bo/commit/4d28dba39ab9638ba6630836083eb47a04e99e25))



# 1.6.0 (2026-04-11)


### Features

* **web:** add interaction lock for animations and online actions ([6e3c2fe](https://github.com/klbsjpolp/skip-bo/commit/6e3c2feb0b640c7cb5206232df334d3c5803f51f))



## 1.5.1 (2026-04-11)



# 1.5.0 (2026-04-11)


### Features

* **web:** add interaction lock for online gameplay actions ([d926876](https://github.com/klbsjpolp/skip-bo/commit/d926876e31ff0526368ab91af0a446d45a9695d6))



## 1.4.2 (2026-04-10)


### Bug Fixes

* **api:** fix linting issues ([69d3bbb](https://github.com/klbsjpolp/skip-bo/commit/69d3bbb54feaac6b53a9ef3614927bbee169d19c))



## 1.4.1 (2026-04-10)



# 1.4.0 (2026-04-06)


### Features

* **build:** update Node.js runtime to 22.x ([056d7a5](https://github.com/klbsjpolp/skip-bo/commit/056d7a5dc65a57ca5b23c4aefe0cd21647a59c0f))



# 1.3.0 (2026-04-06)


### Features

* **monitoring:** add alarms for Lambda, DynamoDB, and API Gateway ([8265987](https://github.com/klbsjpolp/skip-bo/commit/8265987822caf5202d541680c6402253fb3bae87))



## 1.2.2 (2026-04-06)



## 1.2.1 (2026-04-06)



# 1.2.0 (2026-04-05)


### Features

* **ci:** add support for multiple AWS roles and update permissions ([ed6a115](https://github.com/klbsjpolp/skip-bo/commit/ed6a115458b6b11e1686a1fad490d2b498830ab1))



## 1.1.1 (2026-04-05)



# [1.1.0](https://github.com/klbsjpolp/skip-bo/compare/v1.0.12...v1.1.0) (2026-04-05)


### Features

* **web:** add runtime-based API configuration for online multiplayer ([67ae85b](https://github.com/klbsjpolp/skip-bo/commit/67ae85bb96c4beb9452e75ac05e01f1bd65490ac))



## [1.0.12](https://github.com/klbsjpolp/skip-bo/compare/v1.0.11...v1.0.12) (2026-04-05)



## [1.0.11](https://github.com/klbsjpolp/skip-bo/compare/v1.0.10...v1.0.11) (2026-04-05)


### Bug Fixes

* **web:** improve animation handling for settled card states ([beb961b](https://github.com/klbsjpolp/skip-bo/commit/beb961b81c77cbab6f98244d51193f8865afe108))



## [1.0.10](https://github.com/klbsjpolp/skip-bo/compare/v1.0.9...v1.0.10) (2026-04-05)



## [1.0.9](https://github.com/klbsjpolp/skip-bo/compare/v1.0.8...v1.0.9) (2026-04-05)


### Bug Fixes

* **web:** add new button variants and improve OnlineStatusStrip layout ([547252e](https://github.com/klbsjpolp/skip-bo/commit/547252e7a76f6303731d1931e71a2ce569db07ab))



## [1.0.8](https://github.com/klbsjpolp/skip-bo/compare/v1.0.7...v1.0.8) (2026-04-05)


### Bug Fixes

* **web:** improve dialog styles and theme secondary color consistency ([f43c215](https://github.com/klbsjpolp/skip-bo/commit/f43c215e8ef446929296f925fc8d408d984a2913))



## [1.0.7](https://github.com/klbsjpolp/skip-bo/compare/v1.0.6...v1.0.7) (2026-04-05)


### Bug Fixes

* **web:** update debugStrip layout and add growth spacer ([eca8d3d](https://github.com/klbsjpolp/skip-bo/commit/eca8d3d7cd78907dcda51641e4a774f8c5c818bc))



## [1.0.6](https://github.com/klbsjpolp/skip-bo/compare/v1.0.5...v1.0.6) (2026-04-05)


### Bug Fixes

* **web:** conditionally adjust debugStrip alignment in App layout ([8ab6662](https://github.com/klbsjpolp/skip-bo/commit/8ab6662ae78d790bd110b81e578a18f00373130c))
* **web:** update meta tag for mobile web app compatibility ([92d466e](https://github.com/klbsjpolp/skip-bo/commit/92d466ed72bc60586133550a5b7b49fdebdac94a))



## [1.0.5](https://github.com/klbsjpolp/skip-bo/compare/v1.0.4...v1.0.5) (2026-04-05)


### Bug Fixes

* **ci:** restore realtime guard and refresh snapshots ([44038db](https://github.com/klbsjpolp/skip-bo/commit/44038db222bc8a1511994f5cee39ee2a50521be6))



## [1.0.4](https://github.com/klbsjpolp/skip-bo/compare/v1.0.3...v1.0.4) (2026-04-05)


### Bug Fixes

* **web:** add engraved glass victory crown ([c4f6778](https://github.com/klbsjpolp/skip-bo/commit/c4f67783d7b0d60e6a9ce54b10f88e188f44f902))
* **web:** close new game dialog before local restart ([8afce6d](https://github.com/klbsjpolp/skip-bo/commit/8afce6dbaa40a57af162f0e969c1c59f91e0ee90))
* **web:** fill retro victory crowns ([c4e7b84](https://github.com/klbsjpolp/skip-bo/commit/c4e7b8474c060313075b0275cdbfbf231aac8014))
* **web:** fill retro victory crowns ([92ca2c7](https://github.com/klbsjpolp/skip-bo/commit/92ca2c7827399fcb071edf4250a7bd08adb3227f))
* **web:** fill retro victory crowns ([0d6c47d](https://github.com/klbsjpolp/skip-bo/commit/0d6c47de634e1ac59b1eff2cf9419e5ae51ef5aa))
* **web:** fill retro victory crowns ([00b3d54](https://github.com/klbsjpolp/skip-bo/commit/00b3d5474257a63fde5644dfab78ea6844a1d0d6))
* **web:** improve pastel victory visibility ([aaf24b4](https://github.com/klbsjpolp/skip-bo/commit/aaf24b4f64eeb39a79b79500f2e152c2bc24bbbf))
* **web:** keep build piles visible during play animation ([198946a](https://github.com/klbsjpolp/skip-bo/commit/198946a5ba630e8b9dd9ab31c4237844c479e729))
* **web:** keep local discard piles visible during discard animation ([377231f](https://github.com/klbsjpolp/skip-bo/commit/377231f3231fca53c0b92bff85296634788ff16d))
* **web:** move debug button to footer ([06efbc0](https://github.com/klbsjpolp/skip-bo/commit/06efbc02d4cc6b33df21a2e26a1d7a0bfe9b8bd7))
* **web:** rebuild local deck on each new game ([70e5743](https://github.com/klbsjpolp/skip-bo/commit/70e574311db78d82f58987f039900470277f2cb0))
* **web:** reduce rainbow victory sun size ([b8ed84e](https://github.com/klbsjpolp/skip-bo/commit/b8ed84eb34ac14b07bd6c4482d19d3800d8d3f8a))
* **web:** reduce top page spacing ([76639c9](https://github.com/klbsjpolp/skip-bo/commit/76639c9fee5a64caed3aeb84825471b0abef3172))
* **web:** reduce top page whitespace ([3446f24](https://github.com/klbsjpolp/skip-bo/commit/3446f24477dca5b0b9618d0ae97a6d9000dbc586))
* **web:** reduce victory firework scale ([4593bd6](https://github.com/klbsjpolp/skip-bo/commit/4593bd654d6ec26c9c138ba3eb7dee8284d8f9f8))
* **web:** reduce victory firework spread ([593c245](https://github.com/klbsjpolp/skip-bo/commit/593c24542a9a024c750c14105c8f4deba7aa827b))
* **web:** shrink rainbow victory sun ([87a7f1b](https://github.com/klbsjpolp/skip-bo/commit/87a7f1bdb2b992c34b54723fac4b84a1be277d79))
* **web:** shrink rainbow victory sun on small screens ([c0dd1f5](https://github.com/klbsjpolp/skip-bo/commit/c0dd1f5eef779940cd33f65ef27cb62c36cd1d0a))
* **web:** soften glass victory crown ([d47c30c](https://github.com/klbsjpolp/skip-bo/commit/d47c30c56a1a0f2b31ec271650e4d23afb5317c1))
* **web:** strengthen pastel victory contrast ([cfa8c08](https://github.com/klbsjpolp/skip-bo/commit/cfa8c0892646a9a4cfceaa4cf0cab960d36462f0))
* **web:** tighten top page spacing ([1069b91](https://github.com/klbsjpolp/skip-bo/commit/1069b91c21e33fcbdc7d28515bdbe211b87309bb))
* **web:** type lazy game machine context ([4ce4ab6](https://github.com/klbsjpolp/skip-bo/commit/4ce4ab66b6bd4fea8b5b3cecdc0edb5ba599109a))
* **web:** unify button variant styles and move debug controls to footer ([938a019](https://github.com/klbsjpolp/skip-bo/commit/938a019b0bb2136d3682e84902c97d7322c4cfc8))



## [1.0.3](https://github.com/klbsjpolp/skip-bo/compare/v1.0.2...v1.0.3) (2026-04-04)


### Bug Fixes

* skip offline opentofu plan in ci ([c6ccc8e](https://github.com/klbsjpolp/skip-bo/commit/c6ccc8ec4742c6d648cde865ca362ae869d7eecd))



## [1.0.2](https://github.com/klbsjpolp/skip-bo/compare/v1.0.1...v1.0.2) (2026-04-04)


### Bug Fixes

* validate opentofu offline in ci ([19e61e7](https://github.com/klbsjpolp/skip-bo/commit/19e61e73a74ce9c644f1f9620d800c0b81be1419))



## [1.0.1](https://github.com/klbsjpolp/skip-bo/compare/v1.0.0...v1.0.1) (2026-04-04)


### Bug Fixes

* align infra format and theme switcher snapshot ([dc152ca](https://github.com/klbsjpolp/skip-bo/commit/dc152cab43752d19e78b84aa215f9db51a9a3a8d))



# [1.0.0](https://github.com/klbsjpolp/skip-bo/compare/v0.1.1...v1.0.0) (2026-04-04)


### Features

* split skip-bo into a workspace monorepo ([6a53836](https://github.com/klbsjpolp/skip-bo/commit/6a53836a61bffbb70c16fe5faac18168dd0443ec))


### BREAKING CHANGES

* repo scripts, paths, deployment workflows, and package layout now use the apps/packages/infra workspace structure.



## [0.1.1](https://github.com/klbsjpolp/skip-bo/compare/v0.1.0...v0.1.1) (2026-04-03)


### Bug Fixes

* **ui:** adjust card color for better visual consistency ([b61df65](https://github.com/klbsjpolp/skip-bo/commit/b61df65ba95b05e26e9c7332c83c642562d0048e))



# 0.1.0 (2026-04-03)


### Bug Fixes

* reposition discard-pile corner numbers in retro-space on small screens ([3015dd1](https://github.com/klbsjpolp/skip-bo/commit/3015dd11408efd41c96f89d95223830813730ba9))
* restore retro card back ([07467b8](https://github.com/klbsjpolp/skip-bo/commit/07467b8794f37aa2befc639870d810085e8ac38b))
* show correct human selection prompts ([4ab9f50](https://github.com/klbsjpolp/skip-bo/commit/4ab9f50995e46bc3f4a8d8201c20134a8fe61c11))
* **ui:** improve minecraft version badge contrast ([f2b97f5](https://github.com/klbsjpolp/skip-bo/commit/f2b97f57ffbf6e1147ab83e4eb6f3766a1be0938))
* upgrade lucide-react from 0.446.0 to 0.525.0 ([a471257](https://github.com/klbsjpolp/skip-bo/commit/a4712570ecf48d39f2ed247aa05948ae6cceef93))
* upgrade next-themes from 0.3.0 to 0.4.6 ([70fe58b](https://github.com/klbsjpolp/skip-bo/commit/70fe58bcaa078752b2db75b572ce4eadc4ff656b))


### Features

* **animations:** Make AI animations blockingThis change ensures that the game waits for AI card animations to complete before proceeding.Previously, the AI could sometimes play multiple cards in rapid succession without waiting for the corresponding animations to finish. This could lead to a confusing user experience where the UI couldn't keep up with the game's state.This has been addressed by introducing a waitForAnimations function that pauses the game's state machine until all active animations are complete. The flushSync utility from react-dom is also now used to ensure that animation state updates are applied synchronously, preventing race conditions. ([af34db8](https://github.com/klbsjpolp/skip-bo/commit/af34db83c43ec992d972bcc32d70db9e0f804589))
* **ci:** automate releases on deploy ([7f2e39f](https://github.com/klbsjpolp/skip-bo/commit/7f2e39f3bbaa75b74543671cf8b42866a3c159bf))
* Improve win message and card display ([2eb0bc7](https://github.com/klbsjpolp/skip-bo/commit/2eb0bc7dc98ec2115800253a8e7561f022476298))
* **ui:** display app release version ([cbf461a](https://github.com/klbsjpolp/skip-bo/commit/cbf461a0979b53676a881fccdf9ee90b1b57cea5))
