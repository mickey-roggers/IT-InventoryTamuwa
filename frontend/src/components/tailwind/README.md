# Tailwind primitives

These are small, local React wrappers around native HTML elements and Tailwind CSS utilities.

- Do not add shadcn-generated components or `data-slot` conventions here.
- Keep width and page-layout decisions at the call site; primitives must not cap their parent layout.
- Preserve native semantics, keyboard focus, and accessible labels when extending a primitive.
- Prefer direct Tailwind classes in feature components when a pattern is used only once.
