# theguru

![Version](https://img.shields.io/github/package-json/v/ActiveEngagement/theguru?sort=semver)
![Build Status](https://github.com/ActiveEngagement/theguru/actions/workflows/tests.yml/badge.svg)
[![codecov](https://codecov.io/gh/ActiveEngagement/theguru/branch/master/graph/badge.svg?token=I2W5ARIEN6)](https://codecov.io/gh/ActiveEngagement/theguru)
![MIT License](https://img.shields.io/github/license/ActiveEngagement/theguru)

This GitHub action will automatically sync one or more Markdown files with [Guru](https://www.getguru.com) cards.

## Quick Start

*If you are familiar with this action, follow these instructions to quickly get started. If not, [read on](#introduction).*

[Obtain a Guru user API token](https://help.getguru.com/en/articles/4740119-how-to-obtain-your-api-credentials) if you have not done so already. Then, put the email of the token's user in a GitHub Actions secret called `GURU_USER_EMAIL`. Put the token itself in a secret called `GURU_USER_TOKEN`.

Get the [ids or slugs](#identifiers) of the Guru collection, board, and/or board section in which the cards should be created. The easiest way to get these is by navigating to the collection, board, or section in the Guru app and copying them from the URL.

Finally, add the template below to your workflow file (in `.github/workflows`). You may add this to an existing workflow or create a new one solely for Guru. Insert your own [`collection_id`](#collection_id). Optionally insert your own [`board_id`](#board_id) and/or [`board_section_id`](#board_section_id), or remove those lines. Adjust [`cards`](#cards) as desired.

```yaml
      - uses: ActiveEngagement/theguru@v0.4
        with:
          user_email: ${{ secrets.GURU_USER_EMAIL }}
          user_token: ${{ secrets.GURU_USER_TOKEN }}
          collection_id: # UUID or slug
          board_id: # OPTIONAL. UUID or slug
          board_section_id: # OPTIONAL. UUID
          cards: '{ "README.md": "Card Title" }' # Adjust as required.
```

## Introduction

[Guru](https://www.getguru.com) is a "company wiki." Pages of content are called "cards," reside in top-level "collections," and are optionally organized further under "boards." Boards themselves may be grouped in "board groups," and cards within a board may be grouped in "board sections."

This GitHub action will take Markdown files in your repository and sync them with Guru cards—creating, updating, or destroying the cards as necessary. The cards are created in the given Guru collection, and optionally in a board and/or board section. The action tracks card ids with an auto-committed file in your repository.

## Before You Start

Since theguru utilizes the [Guru API](https://developer.getguru.com/reference/authentication), it requires valid API credentials.  If you have not already done so, [obtain a Guru user API token](https://help.getguru.com/en/articles/4740119-how-to-obtain-your-api-credentials). Then make the token and the user's email available to the action by adding them as GitHub Actions secrets.

## A Few Notes

### Identifiers

In order to specify the Guru collection, board, and board section, you will need identifiers for them.

Collections and boards in Guru have both a UUID "id" and a "slug." Slugs comprise an alphanumeric identifier like `iqKLBKpT`, optionally suffixed with a URL-safe version of the entity's name, for example `iqKLBKpT/Some-Collection`. In this action, you may use any of the three formats for collection or board ids. Board sections have only a UUID id and should be specified by it.

The easiest way to acquire these identifiers is by navigating to the entities in the Guru app and inspecting their URLs. For a collection or a board, you should see a URL path like `/collections/125ji/Collection-Name` or `/boards/iqKLBKpT/Board-Name`. You can simply use `125ji` or `125ji/Collection-Name` for the collection and `iqKLBKpT` or `iqKLBKpT/Board-Name` for the board. For a board section, you should see a path like `/boards/iqKLBKpT/Board-Name/?boardSectionId=b81c3jc9-89f9-b4ac-0064-2f071126833d`, from which you can use the board section UUID.

### The Cards File

theguru must keep track of the ids of cards that it has uploaded so that it can update existing and destroy old ones where necessary. By default, it automatically commits an `uploaded-guru-cards.json` file to the root of your repository. You may customize the path to this file with the [`cards_file`](#cards_file) input.

The cards file contains the ids of all previously uploaded cards. The format is:

```json
{
  "path/to/README.md": "e8bba381-0784-4414-b451-f302b6319f4c",
  "path/to/some/other/file.md": "e7bf5163-a195-402d-a119-cfe5974cb764"
}
```

For the most part, this file should take care of itself; you should rarely need to edit it manually.

However, If you wish to sync a Markdown file with a card that already exists in Guru, you'll need to let theguru know about it by placing that card's id in the cards file before the first sync.

Additionally, if you change the file paths of any Markdown files (i.e. rename them or move them to a new directory), you have two options:

1. *Let theguru handle it.* Because the file path changed, theguru will treat it as if the old card was deleted and a new one was added at the new file path. A `DELETE` request will be issued for the old one and a `POST` request for the new one, instead of the typical `PATCH` request. The net result in Guru, however, is the same.
2. *Let theguru know about the new path.* If you need to avoid card re-creation (perhaps you have a lot of cards), you may also update the cards file manually with the new paths.

## Usage

```yaml
      - uses: ActiveEngagement/theguru@v0.4
        with:
          # REQUIRED
          user_email:
          user_token:
          collection_id:
          cards:
          # OPTIONAL
          board_id:
          board_section_id:
          card_footer:
          cards_file:
          debug_logging:
```

### `user_email`

REQUIRED. The user email.

This email will be included in the HTTP Basic Auth header on all API requests. API tokens are tied to a user in Guru. This email must be that of the user with which the `user_token` is associated.

If you wish to keep this email a secret, you may store it in an Actions secret and pass it to theguru.

### `user_token`

REQUIRED. The API token.

This token will be included in the HTTP Basic Auth header on all API requests.

Since this is a sensitive value, you should store it in an Actions secret and pass it to theguru.

### `collection_id`

REQUIRED. The UUID or slug of the collection in which to create cards.

If a card does not exist in Guru for one of the synced Markdown files (i.e. it has not yet been created or it has been removed from Guru), then we will automatically create a new card in the collection indicated by this input.

If a `board_id` is not also specified, then the cards will show up under the "Card not on a Board" node in the Guru interface.

### `cards`

REQUIRED. The cards to sync with Guru.

This input must be a string containing a JSON object of the cards to sync. Each key is the file path to the Markdowon file in the repository, and each value is the title that the Guru card should have.

Do note that cards are tracked by file path. Therefore, if you change the file path for a card, by default theguru will destroy the old card and create a new one in Guru. See [The Cards File](#the-cards-file). Conversly, if you change the title, then the title of the existing Guru card will seamlessly be updated.

Also note that this key must be a YAML string. Since YAML supports a JSON-like format for maps and lists, you must either quote the input:

```yaml
          cards: '{ "path/to/file.md": "Card 1", "path/to/file2.md": "Card 2" }'
```

or make use of YAML multiline strings:

```yaml
          cards: |
            {
              "path/to/file.md": "Card 1",
              "path/to/file2.md": "Card 2"
            }
```

The following will **NOT** work:

```yaml
          cards: { "path/to/file.md": "Card 1", "path/to/file2.md": "Card 2" } # FAILS, since YAML interprets this as a map.
```

### `board_id`

OPTIONAL. The UUID or slug of the board in which to create cards.

If a card does not exist in Guru for one of the synced Markdown files (i.e. it has not yet been created or it has been removed from Guru), then we will automatically create a new card in the collection indicated by `collection_id` and the board indicated by this input.

### `board_section_id`

OPTIONAL. The UUID of the board section in which to create cards.

If a card does not exist in Guru for one of the synced Markdown files (i.e. it has not yet been created or it has been removed from Guru), then we will automatically create a new card in the collection indicated by `collection_id`, the board indicated by `board_id`, and the board section indicated by this input.

If `board_id` is not also specified, this input will be ignored.

### `card_footer`

OPTIONAL. Override the Markdown footer to append to cards.

It is probably desirable that synced cards be distinguishable from normal ones in Guru. For this reason, we automatically append an "Imported from GitHub" footer to all cards.

You may customize this footer with this input, which will be appended to the Markdown file before processing and uploading. The `{{repository_url}}` placeholder will be substituted with the URL of the current repository, in the format `https://github.com/{organization}/{repo}`.

To remove the card footer, pass `false`. To explicitly enable the default footer, pass `true`.

### `cards_file`

OPTIONAL. Override the file in which card ids are stored.

You may customize the path to the [cards file](#the-cards-file), in which uploaded card ids are stored, with this input.

### `debug_logging`

OPTIONAL. Enable debug logging.

This input must be either `true` or `false`. If `true`, then Guru will output more verbose logs. This input performs the same function as checking the "Enable Debug Logging" in GitHub Actions does, but only for logs generated by theguru itself. This input is primarily useful for testing.