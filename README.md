# theguru

![Version](https://img.shields.io/github/package-json/v/ActiveEngagement/theguru?sort=semver)
![Build Status](https://github.com/ActiveEngagement/theguru/actions/workflows/tests.yml/badge.svg)
[![codecov](https://codecov.io/gh/ActiveEngagement/theguru/branch/master/graph/badge.svg?token=I2W5ARIEN6)](https://codecov.io/gh/ActiveEngagement/theguru)
![MIT License](https://img.shields.io/github/license/ActiveEngagement/theguru)

This GitHub action will automatically sync one or more Markdown files with [Guru](https://www.getguru.com) cards.

## Table of Contents

- [Quick Start](#quick-start)
- [Introduction](#introduction)
- [Before You Start](#before-you-start)
- [Shared Inputs](#shared-inputs)
- [Standard Collections](#standard-collections-usage)
- [Synced Collections](#synced-collections-usage)
- [Development](#development)

## Quick Start

*If you are familiar with this action, follow these instructions to quickly get started. If not, [read on](#introduction).*

### Standard Collections

[Obtain a Guru user API token](https://help.getguru.com/en/articles/4740119-how-to-obtain-your-api-credentials) if you have not done so already. Then, put the email of the token's user in a GitHub Actions secret called `GURU_USER_EMAIL`. Put the token itself in a secret called `GURU_USER_TOKEN`.

Get the [ids or slugs](#identifiers) of the Guru collection, board, and/or board section in which the cards should be created. The easiest way to get these is by navigating to the collection, board, or section in the Guru app and copying them from the URL.

Now add the template below to your workflow file (in `.github/workflows`). You may add this to an existing workflow or create a new one solely for Guru. Insert your own [`collection_id`](#collection_id). Optionally insert your own [`board_id`](#board_id) and/or [`board_section_id`](#board_section_id), or remove those lines. Adjust [`cards`](#cards) as desired.

```yaml
      - uses: ActiveEngagement/theguru@v0.6
        with:
          user_email: ${{ secrets.GURU_USER_EMAIL }}
          user_token: ${{ secrets.GURU_USER_TOKEN }}
          github: ${{ toJson(github) }} # Provides some necessary context.
          collection_type: standard
          collection_id: # UUID or slug
          board_id: # OPTIONAL. UUID or slug
          board_section_id: # OPTIONAL. UUID
          cards: | # Adjust as required.
            {
              "README.md": "Card Title"
            }
```

### Synced Collections

[Obtain a Guru user API token](https://help.getguru.com/en/articles/4740119-how-to-obtain-your-api-credentials) if you have not done so already. Then, put the email of the token's user in a GitHub Actions secret called `GURU_USER_EMAIL`. Put the token itself in a secret called `GURU_USER_TOKEN`.

Get the [id or slug](#identifiers) of the Guru collection with which the cards should be synced. The easiest way to get this is by navigating to the collection in the Guru app and copying it from the URL.

Now add the template below to your workflow file (in `.github/workflows`). You may add this to an existing workflow or create a new one solely for Guru. Insert your own [`collection_id`](#collection_id). Adjust [`cards`](#cards) as desired.

```yaml
      - uses: ActiveEngagement/theguru@v0.6
        with:
          user_email: ${{ secrets.GURU_USER_EMAIL }}
          user_token: ${{ secrets.GURU_USER_TOKEN }}
          github: ${{ toJson(github) }} # Provides some necessary context.
          collection_type: synced
          collection_id: # UUID or slug
          cards: | # Adjust as required.
            [
              {
                "glob": "**/*.md"
              }
            ]
```

## Introduction

[Guru](https://www.getguru.com) is a "company wiki." Pages of content are called "cards," reside in top-level "collections," and are optionally organized further under "boards." Boards themselves may be grouped in "board groups," and cards within a board may be grouped in "board sections." Board groups, boards, and board sections are collectively called "containers."

Collections fall into two categories: "standard" (or "internal") and "synced" ("external"), both of which this action supports:

[Standard collections](#standard-collections) are the norm in Guru and function about how you would expect: an admin may create them from the Guru interface, and cards can be created, updated, or destroyed individually by anyone with access. This action supports syncing one or more individual cards to Guru. They are created in the given Guru collection, and optionally in a board and/or board section, and updated or destroyed as necessary. We keep track of card ids with an auto-committed file in your repository. Attachments are supported via the Attachment API. Board/group/section creation is not supported and cards cannot link to each other.

[Synced collections](#synced-collections) are different: they must be created via the API by an admin; cards can only be created, updated, or destroyed via the Manual Sync API; and updates must happen "all at once." This action supports most features of the Guru Manual Sync API, including board structure management, card/board linking, and attachments, making synced collections ideal for lage, structured file sets.

## Before You Start

### API Credentials

Since theguru utilizes the [Guru API](https://developer.getguru.com/reference/authentication), it requires valid API credentials.  If you have not already done so, [obtain a Guru user API token](https://help.getguru.com/en/articles/4740119-how-to-obtain-your-api-credentials). Then make the token and the user's email available to the action by adding them as GitHub Actions secrets.

### Identifiers

In order to reference a Guru collection, board, or board section, you will need identifiers for them.

Collections and boards in Guru have both a UUID "id" and a "slug." Slugs comprise an alphanumeric identifier like `iqKLBKpT`, suffixed with a URL-safe version of the entity's name, for example `iqKLBKpT/Some-Collection`. Ids are UUIDs used in the backend. In this action, you may use either of these formats for collection or board ids. Board sections have only a UUID id and should be specified by it.

The easiest way to acquire these identifiers is by navigating to the entities in the Guru app and inspecting their URLs. For a collection or a board, you should see a URL path like `/collections/125ji/Collection-Name` or `/boards/iqKLBKpT/Board-Name`. You can simply use `125ji/Collection-Name` for the collection and `iqKLBKpT/Board-Name` for the board. For a board section, you should see a path like `/boards/iqKLBKpT/Board-Name/?boardSectionId=b81c3jc9-89f9-b4ac-0064-2f071126833d`, from which you can use the board section UUID.

### JSON Inputs

Several of the inputs to this action are "JSON inputs," which means they require a string representing a JSON object.

However, this value must be a YAML "string." Since YAML supports a JSON-like format for maps and lists, it is easy to confuse it. You must either quote the input:

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

## Shared Inputs

The following inputs exist for both standard and synced collections.

#### `user_email`

REQUIRED. The user email.

This email will be included in the HTTP Basic Auth header on all API requests. API tokens are tied to a user in Guru. This email must be that of the user with which the `user_token` is associated.

If you wish to keep this email a secret, you may store it in an Actions secret and pass it to theguru.

#### `user_token`

REQUIRED. The API token.

This token will be included in the HTTP Basic Auth header on all API requests.

Since this is a sensitive value, you should store it in an Actions secret and pass it to theguru.

#### `github`

REQUIRED. The GitHub context.

This input must be a [JSON object](#json-inputs) representation of the [GitHub context](https://docs.github.com/en/actions/learn-github-actions/contexts#github-context). The object should have at least the following schema:

```json
{
  "repository": "REQUIRED",
  "server_url": "REQUIRED",
  "sha": "REQUIRED",
  "event": {
    "head_commit": {
      "message": "OPTIONAL. Enables commit flags."
    }
  }
}
```

Far and away the easiest way to pass this is by passing the entire GitHub context provided by GitHub Actions like so:

```yaml
          github: ${{ toJson(github) }}
```

#### `collection_type`

REQUIRED. The type of collection being synced with, either `"standard"` or `"synced"`.

In order to prevent confusion, we require you to specify the [type of collection](#introduction) being synced with. If the collection's actual type does not match, the action will abort.

#### `collection_id`

REQUIRED. The UUID or slug of the collection in which to create cards.

This is the collection with which Markdown files will be synced.

#### `attachment_handler`

OPTIONAL. Override the method used to get file attachments into Guru; one of `"auto"` (default), `"upload"`, and `"github_urls"`.

GitHub supports references in Markdown files to images or other files stored in the repository, via relative paths like `"images/test.png"`. This action will attempt to rewrite these URLs using one of two strategies:
  - **`"upload"`**—attachments will be uploaded as [Guru attachments](https://app.getguru.com/card/Tjp5Lbxc/Uploading-Files-to-Cards-via-API) (for standard collections) or included in the collection .zip (for synced collections).
  - **`"github_urls"`**—URLs will be rewritten to public GitHub URLs beginning with `"https://raw.githubusercontent.com/"`. If the file does not exist in the repository, then it will be `upload`ed instead. This method will fail of course for private repositories. 

The default setting, `"auto"`, will use `"upload"` for private repositories and `"github_urls"` for public ones.

#### `verbosity`

OPTIONAL. Determines the amount of output the action will emit; one of `"silent"`, `"error"`, `"notice"`, `"warning"`, `"info"` (default), `"debug"`, and `"trace"`.

This option allows you to control the minimum severity for theguru to emit a log message. The options are listed below. They are progressive, meaning each option includes all those above it.

- `"silent"`—no messages whatsoever, except uncaught exceptions.
- `"error"`—severe errors.
- `"notice"`—very important notices.
- `"warning"`—important notices.
- `"info"`—useful information.
- `"debug"`—some information that may be useful during debugging, without overwhelming the screen.
- `"trace"`—as much information as possible. The output will be substantial and may be difficult to read.

#### `ansi`

OPTIONAL. Whether ANSI escape codes should be emitted, `true` by default.

This input must be either `true` or `false`. When true, ANSI escape codes will be utilized for nice colored output. When `false`, they will be omitted.

## Standard Collections Usage

When syncing with standard collections, we'll look at the list of cards in the [`cards`](#cards-standard) input.

If a card does not exist in Guru (i.e. it has not yet been created or it has been removed from Guru), then we will automatically create a new card in the given [collection](#collection_id), [board](#board_id), and/or [board section](#board_section_id). If the card already exists in Guru, then we'll update it (if it has changed). We keep track of cards with the [cards file](#the-cards-file). Do note that we will never update the collection or container of an existing card. If, therefore, the card is moved after creation, it will retain the new location.

Standard collections are ideal when
  - you have relatively few cards to sync,
  - the cards do not need to link to each other, or when
  - you want to sync with an existing collection.

### The Cards File

theguru must keep track of the ids of cards that it has uploaded so that it can update existing and destroy old ones where necessary. By default, it automatically commits an `uploaded-guru-cards.json` file to the root of your repository. You may customize the path to this file with the [`cards_file`](#cards_file) input. Or, you may disable the cards file by passing `false`. Just note that if you disable the cards file, theguru will not be able to tell whether it has already uploaded a card, so it will always recreate it.

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

### Inputs

```yaml
      - uses: ActiveEngagement/theguru@v0.6
        with:
          # REQUIRED
          user_email:
          user_token:
          github:
          collection_type: standard
          collection_id:
          cards:
          # OPTIONAL
          board_id:
          board_section_id:
          card_footer:
          cards_file:
          attachment_handler:
          update_all:
          verbosity:
          ansi:
```

(See [`user_email`](#user_email), [`user_token`](#user_token), [`github`](#github), [`collection_type`](#collection_type), [`collection_id`](#collection_id), [`attachment_handler`](#attachment_handler), [`verbosity`](#verbosity), and [`ansi`](#ansi) above.)

#### `cards` (standard)

REQUIRED. The cards to sync with Guru.

This input must be a string containing a [JSON object](#json-inputs) of the cards to sync. Each key is the file path to the Markdowon file in the repository, and each value is the title that the Guru card should have. Example:

```yaml
          cards: |
            {
              "path/to/file.md": "Card 1",
              "path/to/file2.md": "Card 2"
            }
```

Do note that cards are tracked by file path. Therefore, if you change the file path for a card, by default theguru will destroy the old card and create a new one in Guru. See [The Cards File](#the-cards-file). Conversly, if you change the title, then the title of the existing Guru card will seamlessly be updated.

#### `board_id`

OPTIONAL. The UUID or slug of the board in which to create cards.

If a card does not exist in Guru for one of the synced Markdown files (i.e. it has not yet been created or it has been removed from Guru), then we will automatically create a new card in the collection indicated by `collection_id` and the board indicated by this input. Do note that we will never update the board of an existing card. If, therefore, the card is moved after creation, it will retain the new location.

#### `board_section_id`

OPTIONAL. The UUID of the board section in which to create cards.

If a card does not exist in Guru for one of the synced Markdown files (i.e. it has not yet been created or it has been removed from Guru), then we will automatically create a new card in the collection indicated by `collection_id`, the board indicated by `board_id`, and the board section indicated by this input. Do note that we will never update the board section of an existing card. If, therefore, the card is moved after creation, it will retain the new location.

If `board_id` is not also specified, this input will be ignored.

#### `card_footer`

OPTIONAL. Override the Markdown footer to append to cards.

With standard collections, it is probably desirable that synced cards be distinguishable from normal ones in Guru. For this reason, we automatically append an "Imported from GitHub" footer to all cards.

You may customize this footer with this input, which will be appended to the Markdown file before processing and uploading. The `{{repository_url}}` placeholder will be substituted with the URL of the current repository, in the format `https://github.com/{organization}/{repo}`.

To remove the card footer, pass `false`. To explicitly enable the default footer, pass `true`.

#### `cards_file`

OPTIONAL. Override or disable the file in which card ids are stored.

You may customize the path to the [cards file](#the-cards-file), in which uploaded card ids are stored, with this input.

If `false` is passed, the cards file will not be used. Cards will not be updated in Guru; they will always be re-created. This option can be useful in creation-only scenarios.

## Synced Collections Usage

When syncing with synced collections, we'll look at the array of card rules in the [`cards`](#cards-synced) input. All the cards matched by the rules will be rewritten as necessary, compiled (along with referenced attachments) into a .zip collection, and uploaded to Guru.

Synced collections are ideal when
  - you have many cards to sync or want to use a glob,
  - the cards need to link to each other, and
  - you don't mind creating a new "synced" collection.


### Container Paths

Since we support managing container structure with synced collections, you will often need to refer to a card or container in the structue. This is done with intuitive, directory-like container paths.

Given this example:

```
- Board Group 1
  - Some Board
    - Section 1
      - A Card
      - Another Card
    - Section 2
  - Another Board
- Board Group 2
- A Root Card
```

To refer to "A Card", simply use "Board Group 1/Some Board/Section 1/A Card". To refer to "A Root Card", use "A Root Card". And so on.

An empty string or forward slash (`/`) will be interpreted as the root container (the "Cards Not In a Board" section in Guru).

### Card/Container "Info"

Guru supports attaching a couple metadata attributes to cards and containers:

- `"title"`—the title of the card or container; shown in the Guru interface.
- `"externalUrl"`—a URL pointing to the card or container; this is not really shown anywhere in the Guru interface, but it could be useful.
- `"description"`—a longer description of a board or board group; this is only shown in rather obscure parts of the Guru interface.

These attributes can be attached in a variety of ways. For cards:

- Info can be attached explicitly in a card rule, as described in [`cards`](#cards-synced).
- Cards may have a "frontmatter" section containing info attributes. We use [graymatter](https://www.npmjs.com/package/gray-matter) to parse frontmatter, so it should conform to their requirements.
- Cards may have a corresponding .yml (or .yaml) file with the same basename containing info attributes. For example, "eula.md" could have a "eula.yml" containing info.
- If not otherwise specified, the title will be derived from the card's filename. For example, "legal_matters.md" will become "Legal Matters".

For containers:

- Info can be attached explicitly in the containers config, as described in [`containers`](#containers). This is the only way to attach info to a container not created from a directory.
- Directories for which a container will be created may contain a `.info.yml` or `.info.yaml` file containing info attributes that will be applied to the container.
- If not otherwise specified, the title will be derived from the container's name. For example, a container created from the directory "path/to/container_one" will become "Container One". A container created via an explicit `"container"` option in a card rule `"some/board one"` will become "Board One".

### Inputs

```yaml
      - uses: ActiveEngagement/theguru@v0.6
        with:
          # REQUIRED
          user_email:
          user_token:
          github:
          collection_type: synced
          collection_id:
          cards:
          # OPTIONAL
          containers:
          preferred_container:
          dry_run:
          card_footer:
          attachment_handler:
          verbosity:
          ansi:
```

(See [`user_email`](#user_email), [`user_token`](#user_token), [`github`](#github), [`collection_type`](#collection_type), [`collection_id`](#collection_id), [`attachment_handler`](#attachment_handler), [`verbosity`](#verbosity), and [`ansi`](#ansi) above.)

#### `cards` (synced)

REQUIRED. Rules indicating the cards to sync with Guru.

This input must be a string containing a [JSON array](#json-inputs) of the card rules by which to sync.

Card rules have the following schema:

```js
{
  "glob": "*.md", // REQUIRED
  "rootDir": "src/", // OPTIONAL
  "container": "test", // OPTIONAL
  "rootContainer": "root", // OPTIONAL
  "title": "Explicit Title", // OPTIONAL, of limited use
  "externalUrl": "https://google.com", // OPTIONAL, of limited use
}
```

Every card rule must provide a `"glob"` key specifying which file(s) it should match. All files matched by the given glob will be included in the sync. If a simple string is given as a card rule instead of a JSON object, then it will be interpretated as a rule with a glob equal to the given string. Thus, `"card.md"` is equivalent to `{ "glob": "card.md" }`.

Next, we need to know by some means what container (board group, board, or board section) each card needs to go into. You may specify this directly with a `"container"` property containing a [container path](#container-paths). Every card matched by that rule will then be put into that container. This can be useful when you have a few specific cards that should go into a specific board.

Frequently though, you will want the container structure to mirror your directory structure—that is the main appeal of using a Synced Collection. This is the default behavior if no `"container"` is specified. For example, with a `"glob"` of `"path/to/dir/card.md"`, the card will be created in the `"dir"` board section under the `"to"` board under the `"path"` board group. With a glob matching different directories, different container paths may result, wherein lies the usefulness of this functionality. Thus, a glob of `"**/*.md"` will mimic the directory structure.

Sometimes, you may need to exclude part of the path. A common scenario is a "docs" folder. Obviously, we don't need a "docs" container in Guru. The `"rootDir"` option allows you to specify a "parent" path that will be evaluated to find the cards but will not be included in the container structure. Take this rule, for example:

```js
{
  "glob": "**/*.md",
  "rootDir": "docs/"
}
```

All Markdown files in the `"docs"` folder will be included and the directory structure *relative to `"docs"`* will be mimicked.

Note that `"rootDir"` is also a glob. A `"rootDir"` of `"{docs, wiki}/"` and a glob of `"**/*.md"` will match all Markdown files under the `"docs"` directory *or* the `"wiki"` directory. The directory structure beneath `"docs"` and `"wiki"` will be mimicked. Since `"rootDir"` is a glob, it should end with a forward slash (`/`), to match only directories.

You may also wish to put the entire mimicked directory structure beneath a specific container in Guru. This can be achieved with the `"rootContainer"` option, like so:

```js
{
  "glob": "**/*.md",
  "rootContainer": "Information"
}
```

Now `"path/to/dir/card.md"` will go in the Guru container `"Information/Path/To/Dir"`, `"root.md"` will go directly in the `"Information"` container, etc.

Finally, you may explicitly include card info (title or external url) in the rule via the `"title"` and `"externalUrl"` options. These values will be applied to all cards matched by the rule, making them of limited use except for single-card rules.

#### `containers`

OPTIONAL. Containers that should be created with the given info.

This input must be a string containing a [JSON object](#json-inputs) mapping [container paths](#container-paths) to objects containing container info. This input serves two purposes.

First, it provides the means for creating containers that would not otherwise be created. If, perhaps, you wanted to create an empty container to be used later, it could be included in this input, like so:

```js
{
  "Empty Container": {}
}
```

With info:

```js
{
  "Empty Container": {
    "title": "Actual Title",
    "description": "Who knows?",
    "externalUrl": "https://google.com"
  }
}
```

Second, and more importantly, it is one of the methods for setting container info. Even if the container would already have been created, you may include it in this input and the info will be applied. For example, if you have a container path `"path/to/dir"` already being created by a card rule, and you wish to set a different title than "Path", "To", and "Dir" on the containers:

```js
{
  "path": {
    title: "Primus"
  },
  "path/to": {
    title: "Secondus"
  },
  "path/to/dir": {
    title: "Tertius"
  }
}
```

#### `preferred_container`

OPTIONAL. Indicates the preferred top-level container; either `"board"` or `"board_group"` (default).

Occasionally there are multiple ways that a given container structure could be created in Guru. Take this tree, for example:

```
- AAA
  - aaa
    - one.md
  - bbb
    - two.md
- BBB
  - ccc
    - three.md
  - ddd
- CCC
  - eee
    - four.md
    - five.md
  - fff
```

There are two ways this could be translated to Guru: (1) the top-level containers (`AAA`, `BBB`, `CCC`) could be board groups and the second-level containers (`aaa`, `bbb`, `ccc`, etc.) could be boards; or (2) the top-level containers could be boards and the second-level containers could be board sections. By default, this action will use a board group at the top level, where possible. You may override this by passing `"board_group"`.

Sometimes it is impossible to respect the preferred container type. For example:

```
- AAA
  - aaa
    - one.md
  - two.md
```

`AAA` contains `two.md` directly. Therefore, since cards cannot be created directly under board groups in Guru, `AAA` will be created as a board and `aaa` as a board section, regardless of the `preferred_container`.

The container type of top-level containers may end up being different, if necessary. For example:

```
- AAA
  - aaa
    - one.md
  - two.md
- BBB
  - bbb
    - three.md
```

Here, assuming `preferred_type` is the default `"board_group"`, `AAA` must be a board (as described above), but `BBB` will be created as a board group.

#### `dry_run`

OPTIONAL. If `true`, indicates that the action shouldn't actually sync the collection with Guru.

For debugging purposes (or if you wish to upload the collection yourself), you may want to prevent the final collection .zip from actually being uploaded to Guru. If this input is `true`, the action will run as usual and will generate the final .zip, but will not upload it. You may then use the `zip` output to inspect the file, or inspect the collection model with the `"trace"` [verbosity](#verbosity).

### Outputs

#### `zip`

This output will be set to the full file path of the created `.zip` collection [required by Guru](https://developer.getguru.com/docs/guru-sync-manual-api). Inspecting it may prove useful for debugging or validating.

## Development

[TODO] The test/env directory.