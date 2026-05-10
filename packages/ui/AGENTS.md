# Packages: UI - Agent Guidelines

This document provides specific instructions for working in `packages/ui`. **These rules complement and, in case of conflicts, override the global monorepo guidelines.**

## Subproject Overview

`packages/ui` is the shared UI component library for the Gravity monorepo. It serves as the single source of truth for the project's design system and reusable interface elements.
These components are meant to be consumed by other TypeScript/React projects in the workspace, such as `apps/gravity` and `apps/web`.

## UI/UX and Component System

*   **Design System**: The project uses **shadcn/ui** as its primary component foundation. 
*   **Agent Instructions for shadcn**: AI agents working in this package have the permission and ability to install new `shadcn` components as needed to fulfill design requirements. Always ensure that the installed components adhere to the project's established styling and theming.
*   **Reusability**: Every component built or installed here must be generic and decoupled. Avoid adding business logic specific to `apps/gravity` or `apps/web` inside this package.

## Code Style and Guidelines

*   **Typing**: Strict TypeScript must be used for all components.
*   **Exports**: Ensure that any new component or utility created/installed is properly exported from the package's main entry point so that consumer apps can import them via the workspace reference.
*   **Styling**: Follow the existing Tailwind CSS configuration and utility classes setup within this package.

## Common Agent Tasks

1.  **Installing shadcn Components**: Use the appropriate CLI commands (or `npx shadcn@latest add ...`) to add new components (e.g., button, dialog, dropdown) when requested.
2.  **Creating Custom Components**: Build bespoke React components that compose multiple shadcn elements to create complex, reusable blocks.
3.  **Theming Adjustments**: Modify Tailwind configurations, CSS variables, or component variants to ensure a cohesive and highly polished design language across the ecosystem.
