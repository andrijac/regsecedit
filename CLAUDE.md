# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RegSecEdit is a Windows-only command-line utility (with an optional Windows Forms GUI) that modifies Windows Registry key ACLs (Access Control Lists) programmatically. It targets **.NET Framework 3.5** and produces a single standalone executable.

## Build

This is an MSBuild project. Build from the solution root:

```
msbuild source/regsecedit.sln /p:Configuration=Release
```

Or open `source/regsecedit.sln` in Visual Studio. The compiled output goes to `bin/regsecedit.exe`.

There is no package restore step — the project has no NuGet or external dependencies beyond the .NET Framework 3.5 BCL.

## Tests & Linting

There are no automated tests and no linting configuration. Several `TODO: test` and `TODO: validate` comments exist in the code marking unfinished validation logic.

## Architecture

The application has two runtime modes controlled by the `-form` flag:
- **CLI mode** (default): parse arguments → build `ExecutionInfo` → apply registry ACL change
- **GUI mode** (`-form`): show the `CommandLineBuilder` Windows Form (partially implemented)

### Layers

| Layer | Files | Role |
|---|---|---|
| Entry point | `source/Program.cs` | Dispatches to CLI or GUI mode; maps `Branch` enum → `RegistryKey` |
| Parameter parsing | `source/Factory.cs` | Defines all CLI flags; converts raw strings to typed values |
| Data model | `source/Objects/` | `ExecutionInfo` (operation context), `Parameter`/`ParameterList` (CLI arg wrappers) |
| Enumerations | `source/Enums.cs` | `Branch` enum for registry hives |
| GUI | `source/Form/CommandLineBuilder.cs` | Windows Forms builder — exists but event handlers are not wired up |
| Resources | `source/Resources.resx` | Help text and status messages embedded in the executable |

### CLI Flag → Parameter mapping (`Factory.cs`)

| Flag | Meaning |
|---|---|
| `-p` | Registry key path (e.g. `Software\MyApp`) |
| `-b` | Hive branch (`Machine`, `User`, `ClassesRoot`, etc.) |
| `-u` | User/identity |
| `-a` | Access type (`0` = Allow, `1` = Deny) |
| `-r` | Permission bitmask (e.g. `983103` = FullControl) |
| `-i` | `InheritanceFlags` (`0`=None, `1`=ContainerInherit, `2`=ObjectInherit) |
| `-o` | `PropagationFlags` (`0`=None, `1`=NoPropagateInherit, `2`=InheritOnly) |
| `-e` | Permission to exclude from the set (XOR'd out of `-r`) |

### Execution flow

```
Main() → ParameterList.parse(args)
       → Factory.build(params) → ExecutionInfo
       → RegistryKey.OpenSubKey(path, writable:true)
       → RegistrySecurity + RegistryAccessRule
       → key.SetAccessControl(security)
```

## Documentation Policy

**Every change must be documented.** This applies to all projects in this repo.

- After any code change, update the relevant `README.md` with what changed and why
- If a conversation reveals design decisions, constraints, or non-obvious behavior, add it to the README immediately — not later
- New sections, env vars, API endpoints, architectural decisions, `.gitignore` entries, deployment notes — all go in the README
- Commit the README update in the same commit as the code change, or immediately after

This rule applies to `torrent-rss/README.md` and any future subprojects.

---

### Known incomplete areas

- Parameter validation is explicitly deferred (`TODO: validate parameters` in `Program.cs:37`)
- The `CommandLineBuilder` form exists but its controls are not connected to any logic
- Error handling is a single top-level catch that prints the exception message
