# eslint-plugin-import

[![build status](https://travis-ci.org/benmosher/eslint-plugin-import.svg?branch=master)](https://travis-ci.org/benmosher/eslint-plugin-import)
[![Coverage Status](https://coveralls.io/repos/benmosher/eslint-plugin-import/badge.svg?branch=master&service=github)](https://coveralls.io/github/benmosher/eslint-plugin-import?branch=coverage)
[![win32 build status](https://ci.appveyor.com/api/projects/status/3mw2fifalmjlqf56/branch/master?svg=true)](https://ci.appveyor.com/project/benmosher/eslint-plugin-import/branch/master)
[![npm](https://img.shields.io/npm/v/eslint-plugin-import.svg)](https://www.npmjs.com/package/eslint-plugin-import)

This plugin intends to support linting of ES2015+ (ES6+) import/export syntax, and prevent issues with misspelling of file paths and import names. All the goodness that the ES2015+ static module syntax intends to provide, marked up in your editor.

**IF YOU ARE USING THIS WITH SUBLIME**: see the [bottom section](#sublimelinter-eslint) for important info.

## Rules

* Ensure imports point to a file/module that can be resolved. ([`no-unresolved`])
* Ensure named imports correspond to a named export in the remote file. ([`named`])
* Ensure a default export is present, given a default import. ([`default`])
* Ensure imported namespaces contain dereferenced properties as they are dereferenced. ([`namespace`])
* Report any invalid exports, i.e. re-export of the same name ([`export`])

[`no-unresolved`]: ./docs/rules/no-unresolved.md
[`named`]: ./docs/rules/named.md
[`default`]: ./docs/rules/default.md
[`namespace`]: ./docs/rules/namespace.md
[`export`]: ./docs/rules/export.md

Helpful warnings:

* Report use of exported name as identifier of default export ([`no-named-as-default`])

[`no-named-as-default`]: ./docs/rules/no-named-as-default.md

Style guide:

* Report CommonJS `require` calls and `module.exports` or `exports.*`. ([`no-commonjs`])
* Report AMD `require` and `define` calls. ([`no-amd`])
* Ensure all imports appear before other statements ([`imports-first`])
* Report repeated import of the same module in multiple places ([`no-duplicates`])

[`no-commonjs`]: ./docs/rules/no-commonjs.md
[`no-amd`]: ./docs/rules/no-amd.md
[`imports-first`]: ./docs/rules/imports-first.md
[`no-duplicates`]: ./docs/rules/no-duplicates.md

Work in progress:

* Report imported names marked with `@deprecated` documentation tag ([`no-deprecated`])

Note that the WIP rules may change drastically, and without a major version bump, but are included in the published version in the interest of gathering feedback (and hopefully being useful as-is).

[`no-deprecated`]: ./docs/rules/no-deprecated.md

## Installation

```sh
npm install eslint-plugin-import -g
```

or if you manage ESLint as a dev dependency:

```sh
# inside your project's working tree
npm install eslint-plugin-import --save-dev
```

All rules are off by default. However, you may configure them manually
in your `.eslintrc.(yml|json|js)`, or extend one of the canned configs:

```yaml
---
extends:
  - eslint:recommended
  - plugin:import/errors
  - plugin:import/warnings

# or configure manually:
plugins:
  - import

rules:
  import/no-unresolved: [2, {commonjs: true, amd: true}]
  import/named: 2
  import/namespace: 2
  import/default: 2
  import/export: 2
  # etc...
```

# Resolver plugins

With the advent of module bundlers and the current state of modules and module
syntax specs, it's not always obvious where `import x from 'module'` should look
to find the file behind `module`.

Up through v0.10ish, this plugin has directly used substack's [`resolve`] plugin,
which implements Node's import behavior. This works pretty well in most cases.

However, Webpack allows a number of things in import module source strings that
Node does not, such as loaders (`import 'file!./whatever'`) and a number of
aliasing schemes, such as [`externals`]: mapping a module id to a global name at
runtime (allowing some modules to be included more traditionally via script tags).

In the interest of supporting both of these, v0.11 introduces resolver plugins.
At the moment, these are modules exporting a single function:

```js

exports.resolveImport = function (source, file, config) {
  // return source's absolute path given
  // - file: absolute path of importing module
  // - config: optional config provided for this resolver

  // return `null` if source is a "core" module (i.e. "fs", "crypto") that
  // can't be found on the filesystem
}
```

The default `node` plugin that uses [`resolve`] is a handful of lines:

```js
var resolve = require('resolve')
  , path = require('path')
  , assign = require('object-assign')

exports.resolveImport = function resolveImport(source, file, config) {
  if (resolve.isCore(source)) return null

  return resolve.sync(source, opts(path.dirname(file), config))
}

function opts(basedir, config) {
  return assign( {}
               , config
               , { basedir: basedir }
               )
}
```

It essentially just uses the current file to get a reference base directory (`basedir`)
and then passes through any explicit config from the `.eslintrc`; things like
non-standard file extensions, module directories, etc.

Currently [Node] and [Webpack] resolution have been implemented, but the
resolvers are just npm packages, so third party packages are supported (and encouraged!).

Just install a resolver as `eslint-import-resolver-foo` and reference it as such:

```yaml
settings:
  import/resolver: foo
```

or with a config object:

```yaml
settings:
  import/resolver:
    foo: { someConfigKey: value }
```

[`resolve`]: https://www.npmjs.com/package/resolve
[`externals`]: http://webpack.github.io/docs/library-and-externals.html

[Node]: https://www.npmjs.com/package/eslint-import-resolver-node
[Webpack]: https://www.npmjs.com/package/eslint-import-resolver-webpack

# Settings

You may set the following settings in your `.eslintrc`:

#### `import/ignore`

A list of regex strings that, if matched by a path, will
not report the matching module if no `export`s are found.
In practice, this means rules other than [`no-unresolved`](./docs/rules/no-unresolved.md#ignore) will not report on any
`import`s with (absolute) paths matching this pattern, _unless_ `export`s were
found when parsing. This allows you to ignore `node_modules` but still properly
lint packages that define a [`jsnext:main`] in `package.json` (Redux, D3's v4 packages, etc.).

`no-unresolved` has its own [`ignore`](./docs/rules/no-unresolved.md#ignore) setting.

**Note**: setting this explicitly will replace the default of `node_modules`, so you
may need to include it in your own list if you still want to ignore it. Example:

```yaml
settings:
  import/ignore:
    - node_modules       # mostly CommonJS (ignored by default)
    - \.coffee$          # fraught with parse errors
    - \.(scss|less|css)$ # can't parse unprocessed CSS modules, either
```

[`jsnext:main`]: https://github.com/rollup/rollup/wiki/jsnext:main

#### `import/resolver`

See [resolver plugins](#resolver-plugins).

## SublimeLinter-eslint

SublimeLinter-eslint introduced a change to support `.eslintignore` files
which altered the way file paths are passed to ESLint when linting during editing.
This change sends a relative path instead of the absolute path to the file (as ESLint
normally provides), which can make it impossible for this plugin to resolve dependencies
on the filesystem.

This workaround should no longer be necessary with the release of ESLint 2.0, when
`.eslintignore` will be updated to work more like a `.gitignore`, which should
support proper ignoring of absolute paths via `--stdin-filename`.

In the meantime, see [roadhump/SublimeLinter-eslint#58](https://github.com/roadhump/SublimeLinter-eslint/issues/58)
for more details and discussion, but essentially, you may find you need to add the following
`SublimeLinter` config to your Sublime project file:

```json
{
    "folders":
    [
        {
            "path": "code"
        }
    ],
    "SublimeLinter":
    {
        "linters":
        {
            "eslint":
            {
                "chdir": "${project}/code"
            }
        }
    }
}
```

Note that `${project}/code` matches the `code` provided at `folders[0].path`.

The purpose of the `chdir` setting, in this case, is to set the working directory
from which ESLint is executed to be the same as the directory on which SublimeLinter-eslint
bases the relative path it provides.

See the SublimeLinter docs on [`chdir`](http://www.sublimelinter.com/en/latest/linter_settings.html#chdir)
for more information, in case this does not work with your project.

If you are not using `.eslintignore`, or don't have a Sublime project file, you can also
do the following via a `.sublimelinterrc` file in some ancestor directory of your
code:

```json
{
  "linters": {
    "eslint": {
      "args": ["--stdin-filename", "@"]
    }
  }
}
```

I also found that I needed to set `rc_search_limit` to `null`, which removes the file
hierarchy search limit when looking up the directory tree for `.sublimelinterrc`:

In Package Settings / SublimeLinter / User Settings:
```json
{
  "user": {
    "rc_search_limit": null
  }
}
```

I believe this defaults to `3`, so you may not need to alter it depending on your
project folder max depth.
