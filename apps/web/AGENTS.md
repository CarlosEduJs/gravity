# Apps: Web - Agent Guidelines

This document provides specific instructions for working in `apps/web`. **These rules complement and, in case of conflicts, override the global monorepo guidelines.**

## Subproject Overview

`apps/web` is reserved to be the official **Website and Documentation** for the Gravity project. 
Currently, the site **has not been created yet**, but its main purpose will be to serve as the central repository to host documentation for both `apps/gravity` (the desktop client) and `packages/core` (the Go backend).

## Future Development

*   **Initialization**: Since the site does not exist yet, one of the first tasks will be to set up the web project using robust frameworks with SSG (Static Site Generation) support, recommended for documentation, such as **Next.js**, **Astro**, or **Vitepress**. The use of Bun as the dependency manager should be maintained.
*   **To run in development environment**: The script provided at the root of the monorepo to start this subproject is `bun run dev:web`.

## Documentation Style and Guidelines

*   **Target Audience**: The documentation will focus on two types of developers/users:
    1.  Contributors/Users of the Go core.
    2.  End-users of the desktop application.
*   **File Formatting**: The base documentation content will likely be focused on Markdown (`.md` or `.mdx`). Ensure that code examples in the documentation files reflect the *Alpha* version of the Core and the current development version of the Desktop.

## Common Agent Tasks

1.  **Initial Site Setup**: Initialize a modern documentation template (e.g., Nextra, Docusaurus, or VitePress) seamlessly integrated with the existing Turborepo.
2.  **Docs Synchronization**: Create scripts that extract comments (godoc/tsdoc) from `packages/core` and `apps/gravity` and convert them into static reference pages.