# SvelteKit PDF Editor

A fork of [TheBlankness/sveltekit-pdf-editor](https://github.com/TheBlankness/sveltekit-pdf-editor) with additional improvements, bug fixes, UI refinements, and editor functionality.

This README focuses specifically on the features and improvements added to this fork.

## New Features and Improvements

### Highlight Annotations

- Highlights can now be resized.
- Highlights can now be moved.
- Highlights can now be rotated.
- Improved highlight annotation behavior.

### Keyboard Shortcuts

- Added new keyboard shortcuts for common editor actions.
- Documented existing macOS keyboard shortcuts.

### Text Annotations

- Improved the text component.
- Fixed an issue where text could escape its selection box when using smaller font sizes.
- Improved text positioning and selection behavior.

### Editor Interface

- Improved the toolbar design.
- Updated tool button styling.
- Improved selection box styling.
- Fixed a selection box issue that prevented objects from being resized correctly.

### Eraser

- Standardized the eraser size limit to 50.
- Fixed an issue where the size controls could increase the eraser beyond the configured maximum.
- The previous maximum of 67 was intentional, but was inconsistent with the 50-point slider limit and felt out of place. The maximum is now consistently set to 50.

### Codebase Improvements

- Updated outdated Svelte syntax.
- Updated and improved Svelte runes usage.
- Improved TypeScript type handling.
- Added more robust error and type handling.
- Updated Bun dependencies.
- Updated Tailwind configuration.
- Updated icon packages.
- Removed dependencies and files that were not needed for this fork.
- General code cleanup and modernization.

## Credits

This project is a fork of:

[TheBlankness/sveltekit-pdf-editor](https://github.com/TheBlankness/sveltekit-pdf-editor)

The original project credits and builds upon work from:

- [ShizukuIchi/pdf-editor](https://github.com/ShizukuIchi/pdf-editor)
- [kywch/pdf-editor](https://github.com/kywch/pdf-editor)

This fork retains those credits while continuing development with additional fixes, improvements, and functionality.