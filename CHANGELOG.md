# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

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
