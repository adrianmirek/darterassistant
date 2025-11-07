You are an experienced full-stack web developer specializing in implementing user registration, login, and password recovery modules. Develop a detailed architecture for this functionality based on requirements from @project-prd.md (US-003 and US-004) and the stack from @tech-stack.md.

Ensure compatibility with remaining requirements - you cannot break existing application behavior described in the documentation.

The specification should include the following elements:

1. USER INTERFACE ARCHITECTURE
- Detailed description of changes in the frontend layer (pages, components, and layouts in auth and non-auth mode), including description of new elements and those to be extended with authentication requirements
- Precise separation of responsibilities between forms and client-side React components vs. Astro pages, taking into account their integration with the authentication backend, navigation, and user actions
- Description of validation cases and error messages
- Handling of the most important scenarios

2. BACKEND LOGIC
- Structure of API endpoints and data models consistent with new user interface elements
- Input data validation mechanism
- Exception handling
- Update of server-side rendering method for selected pages taking into account @astro.config.mjs

3. AUTHENTICATION SYSTEM
- Use of Supabase Auth to implement registration, login, logout, and account recovery functionality in conjunction with Astro

Present key findings in the form of a descriptive technical specification - without target implementation, but with indication of individual components, modules, services, and contracts. After completing the task, create a file .ai/auth-spec.md and add the entire specification there.