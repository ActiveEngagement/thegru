# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## 0.2.0 - 2021-01-05

### Added
- Fancy logging.

### Changed
This version featured some drastic changes:
- Switched from querying Guru for existing cards by title to storing the card ids in an auto-committed `uploaded-guru-cards.json` in the repository.
- Switched from the `file_path` and `card_title` inputs to a JSON `cards` input which allows for multiple cards to be synced.

## 0.1.5 - 2023-01-03

### Fixed
- Fixed a bug where the repository url in card footers was `undefined/undefined`.

## 0.1.4 - 2023-01-03

### Fixed
- Fixed a bug where the default card footer was not getting appended.
- Fixed a bug where the `card_footer: true` did not cause the default card footer to be appended.
- Fixed an issue where new cards were being created instead of existing ones being overwritten.
- Fixed an issue where the action might fail if debug logging was enabled.


## 0.1.3 - 2023-01-03

### Added
- Added the `debug_logging` input to allow enabling debug logging independently of the GH setting.

### Fixed
- Fixed several fatal errors.

## 0.1.2 - 2023-01-03

### Fixed
- Fixed a fatal error related to a broken resource path. (**NOTE**: This did not actually solve the problem. Please use v0.1.3 or greater.)

## 0.1.1 - 2023-01-03

### Fixed
- Fixed a fatal error related to an undefined variable.

## 0.1.0 - 2023-01-03
### Added
- Initial documented version.

[Unreleased]: https://github.com/ActiveEngagement/theguru/compare/v0.2.0...HEAD
