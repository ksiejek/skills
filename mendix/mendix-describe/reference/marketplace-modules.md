# Marketplace modules

<!-- Made by tools/build-marketplace.js from MxScout's public/marketplace.js and public/advisories.js — edit those, then run the script. -->

What each Marketplace module is, its module roles and which of them is the administrative one, and the known security advisories that name it — 28 modules, written on 2026-10-19 from each module’s page on docs.mendix.com. MxScout carries the same table and draws from it the Security screen’s Marketplace modules card and the documentation’s Marketplace modules.

**How the skill uses it.** Every Marketplace module of the model gets a module description — one or two sentences, a `summary` only — written from this table and from the module’s `## module <Name> (Marketplace)` block in the pack: its version, whether the app uses it (and through what), the user roles that carry its module roles, and what MxScout concluded about them. **Never read a Marketplace module’s flows to describe it** — the pack does not list them, and the description says what the module is for in this app, not how it works inside. A module not in this table is described from its name and its contents only, and its description says “not in the catalogue”.

**The administrative role.** The role marked **admin** below. For a role this table does not list, MxScout counts it administrative when its name says so (Admin, Administrator, Manager — not a read-only variant) or when it may create and delete every entity of the module with no XPath and run a configuration, import or export flow of it. Such a role on a user role that is not the application’s administrator (App Security’s administrator role, or a role that manages every role) is a finding, `mx-market-admin-…`.

**Where a role comes from.** *docs*: the Mendix documentation names it. *model*: the documentation does not; the role was seen in a real model, and what it may do is what that model’s access rules gave it at the version named. Roles a team added to a Marketplace module are not here — MxScout reads them from the model.

| Module | What it is | Administrative role | Known advisories |
|---|---|---|---|
| `Administration` | Pages for managing the app’s own local user accounts, with read-only views of active sessions, scheduled events and runtime statistics. | Administrator | — |
| `AmazonTranslateConnector` | Translates text through Amazon Translate, lists its languages and manages custom terminology; it signs in to AWS through AWS Authentication. | no module roles | — |
| `Atlas_Core` | The base look of the app: the layouts, the styling and the design properties its widgets use. | no module roles | — |
| `Atlas_Web_Content` | Ready-made page templates and building blocks for web pages; it comes with the blank starter app and may be removed. | none | — |
| `AuditTrail` | Keeps a history of changes to chosen records — what changed, when and by whom — as the whole record or only the changed fields. | MxAdministrator | — |
| `AWSAuthentication` | Holds the AWS credentials — fixed keys or short-lived ones — that the other AWS connectors sign in with. | Admin | — |
| `Calendar` | Shows calendar events and lets users create and move them. | none | — |
| `CommunityCommons` | A toolbox of reusable server-side actions for dates, text, files, batches and configuration. | none | — |
| `CopyToClipboard` | A widget that copies a value to the clipboard (no page on docs.mendix.com). | no module roles | — |
| `DataWidgets` | Widgets for lists and tables of data — Data Grid 2, Gallery, filters, sorting, selection and tree node — and an export to Excel. | none | — |
| `Email_Connector` | Sends and receives email through the organisation’s own mail server, with templates, signing and encryption, as building blocks rather than a finished feature. | EmailConnectorAdmin | CVE-2022-45936 |
| `Encryption` | Encrypts and decrypts stored text, such as passwords to other systems, with a key kept on the server; it can also encrypt files. | User | CVE-2024-39888 |
| `ExcelImporter` | Imports Excel sheets into the app’s data by a mapping of columns to attributes, creating or changing records. | Configurator | CVE-2022-34467 |
| `FileUploader` | A drag-and-drop upload widget for files and images, several at once, with previews. | none | — |
| `MCPServer` | Opens the app to outside AI tools through the Model Context Protocol, offering chosen microflows as tools and prompts; without an authentication microflow anyone can reach it. | no module roles | — |
| `MxModelReflection` | Gives the running app a readable copy of its own entities, attributes and microflows, mostly to pick them in configuration pages. | ModelAdministrator | — |
| `NanoflowCommons` | Common client-side actions for web and mobile — device storage, navigation, device features; what it keeps on the device is outside entity access. | none | — |
| `NativeMobileResources` | Widgets and actions for native and hybrid mobile apps. | none | — |
| `OQL` | Lets microflows run free-form OQL queries and get rows, counts or a CSV file; the query is not checked and runs without entity access. | Administrator | — |
| `PushNotifications` | Sends notifications to users’ phones and browsers when they are not using the app. | Administrator | — |
| `SAML20` | Single sign-on with SAML 2.0: users sign in at the organisation’s identity provider, and accounts can be created on first sign-in with a set user role. | Administrator | CVE-2026-80465, CVE-2025-40758, CVE-2023-29129, CVE-2023-25957 |
| `UserCommons` | The user provisioning shared by the OIDC, SAML and SCIM modules (no page of its own on docs.mendix.com). | Administrator | — |
| `WebActions` | Small browser actions: move the focus, scroll to an element, take a picture with the camera. | no module roles | — |
| `ZipHandling` | Java actions to zip and unzip files (no page on docs.mendix.com). | none | — |
| `OIDC` | Single sign-on with OpenID Connect; it can take user roles from the identity provider’s token and protect the app’s APIs with access tokens. | Administrator | CVE-2025-40571 |
| `LDAP` | Synchronises users, their groups and active state from a directory such as Active Directory, maps groups to user roles, and can require an LDAP sign-in. | LdapAdmin | CVE-2024-56841 |
| `ForgotPassword` | Self-service sign-up and password reset for local accounts by an emailed link. | Administrator | CVE-2023-43623, CVE-2023-27464, CVE-2022-26313, CVE-2022-26314 |
| `WorkflowCommons` | A starting kit for workflows: a task inbox, dashboards, an admin centre and reassigning the tasks of people who leave. | Administrator | CVE-2022-46664 |

## `Administration`

Pages for managing the app’s own local user accounts, with read-only views of active sessions, scheduled events and runtime statistics. [Documentation](https://docs.mendix.com/appstore/modules/administration/)

- **Administrator** (admin) — Creates and deletes accounts, reads and changes other accounts’ name and email, and sets other users’ passwords. *(named in the documentation)*
- **User** — Edits its own name and email and reads other users’ name and email; the documentation says the finer roles replace it. *(named in the documentation)*
- **ReadOwnDetails** — Reads its own name and email. *(named in the documentation)*
- **EditOwnDetails** — Reads and edits its own name and email. *(named in the documentation)*
- **EditOwnPassword** — Changes its own password. *(named in the documentation)*
- **ReadOthersFullName** — Reads other users’ full names. *(named in the documentation)*
- **ReadOthersEmail** — Reads other users’ email addresses. *(named in the documentation)*

## `AmazonTranslateConnector`

Translates text through Amazon Translate, lists its languages and manages custom terminology; it signs in to AWS through AWS Authentication. [Documentation](https://docs.mendix.com/appstore/modules/aws/amazon-translate/)

No module roles.

## `Atlas_Core`

The base look of the app: the layouts, the styling and the design properties its widgets use. [Documentation](https://docs.mendix.com/appstore/modules/atlas-core/)

No module roles.

## `Atlas_Web_Content`

Ready-made page templates and building blocks for web pages; it comes with the blank starter app and may be removed. [Documentation](https://docs.mendix.com/howto/front-end/get-started/)

- **Anonymous** — Runs the sign-in flows of the module’s login page (ACT_Login, DS_LoginContext) and their non-persistable LoginContext. *(not in the documentation; seen in a real model; what it may do read from a model at version 3.8.0)*

## `AuditTrail`

Keeps a history of changes to chosen records — what changed, when and by whom — as the whole record or only the changed fields. [Documentation](https://docs.mendix.com/appstore/modules/audit-trail/)

- **MxAdministrator** (admin) — Reads the change log and may create and delete log entries (all five of the module’s entities with rules), on the log pages. *(not in the documentation; seen in a real model; what it may do read from a model at version 10.2.2)*
- **BasicRightsAudittrail** — Reads the change log on the log pages. *(not in the documentation; seen in a real model; what it may do read from a model at version 10.2.2)*

## `AWSAuthentication`

Holds the AWS credentials — fixed keys or short-lived ones — that the other AWS connectors sign in with. [Documentation](https://docs.mendix.com/appstore/modules/aws/aws-authentication/)

- **Admin** (admin) — Edits, saves, validates and deletes the AWS credential settings. *(not in the documentation; seen in a real model; what it may do read from a model at version 4.0.0)*
- **User** — Nothing in the module’s pages or flows. *(not in the documentation; seen in a real model; what it may do read from a model at version 4.0.0)*

## `Calendar`

Shows calendar events and lets users create and move them. [Documentation](https://docs.mendix.com/appstore/modules/calendar-module/)

- **User** — Creates, changes and deletes calendar events. *(not in the documentation; seen in a real model; what it may do read from a model at version 2.2.0)*
- **Viewer** — Reads calendar events. *(not in the documentation; seen in a real model; what it may do read from a model at version 2.2.0)*

## `CommunityCommons`

A toolbox of reusable server-side actions for dates, text, files, batches and configuration. [Documentation](https://docs.mendix.com/appstore/modules/community-commons-function-library/)

- **Administrator** — Full rights on two non-persistable helper entities (ImageDimensions, SplitItem); no page or flow. *(not in the documentation; seen in a real model; what it may do read from a model at version 11.1.0)*
- **User** — Full rights on two non-persistable helper entities (ImageDimensions, SplitItem); no page or flow. *(not in the documentation; seen in a real model; what it may do read from a model at version 11.1.0)*

## `CopyToClipboard`

A widget that copies a value to the clipboard (no page on docs.mendix.com). No page on docs.mendix.com.

No module roles.

## `DataWidgets`

Widgets for lists and tables of data — Data Grid 2, Gallery, filters, sorting, selection and tree node — and an export to Excel. [Documentation](https://docs.mendix.com/appstore/modules/data-widgets/)

- **User** — Nothing in the module’s pages, flows or entities. *(not in the documentation; seen in a real model; what it may do read from a model at version 3.9.0)*

## `Email_Connector`

Sends and receives email through the organisation’s own mail server, with templates, signing and encryption, as building blocks rather than a finished feature. [Documentation](https://docs.mendix.com/appstore/modules/email-connector/)

- **EmailConnectorAdmin** (admin) — Configures the email accounts, templates and keys; the documentation asks to review its preset access before giving it to anyone. *(named in the documentation; what it may do read from a model at version 6.2.0)*
- **ServiceDeskUser** — Reads two of the module’s entities and writes one. *(not in the documentation; seen in a real model; what it may do read from a model at version 6.2.0)*

- CVE-2022-45936 (SSA-224632, 2022-12-13): Handles access control on some of its entities wrongly, so a signed-in user could read and change sensitive information — Mendix Email Connector below 2.0.0. https://cert-portal.siemens.com/productcert/pdf/ssa-224632.pdf

## `Encryption`

Encrypts and decrypts stored text, such as passwords to other systems, with a key kept on the server; it can also encrypt files. [Documentation](https://docs.mendix.com/appstore/modules/encryption/)

- **User** (admin) — Opens the module’s key and certificate pages (CertificateManagement, PrivateKey_NewEdit) and creates and deletes PGP certificates and stored passwords — the module’s only role, and an administrative one. *(not in the documentation; seen in a real model; what it may do read from a model at version 11.0.0)*

- CVE-2024-39888 (SSA-998949, 2024-07-09): Ships a hard-coded default EncryptionKey, so the data of an app that never set its own key can be decrypted by anyone — Mendix Encryption from 10.0.0 below 10.0.2. https://cert-portal.siemens.com/productcert/html/ssa-998949.html

## `ExcelImporter`

Imports Excel sheets into the app’s data by a mapping of columns to attributes, creating or changing records. [Documentation](https://docs.mendix.com/appstore/modules/excel-importer/)

- **Configurator** (admin) — Creates, changes and deletes import templates and runs imports into any entity a template names. *(not in the documentation; seen in a real model; what it may do read from a model at version 11.1.0)*
- **Readonly** — Reads the import templates. *(not in the documentation; seen in a real model; what it may do read from a model at version 11.1.0)*

- CVE-2022-34467 (SSA-610768, 2022-07-12): Is open to XML entity expansion, which an attacker could use to make it unavailable — Mendix Excel Importer Module (Mendix 8 compatible) below 9.2.2; Mendix Excel Importer Module (Mendix 9 compatible) below 10.1.2. https://cert-portal.siemens.com/productcert/pdf/ssa-610768.pdf

## `FileUploader`

A drag-and-drop upload widget for files and images, several at once, with previews. [Documentation](https://docs.mendix.com/appstore/modules/file-uploader/)

- **User** — Uploads files and images (creates and deletes the module’s file documents). *(not in the documentation; seen in a real model; what it may do read from a model at version 2.2.1)*

## `MCPServer`

Opens the app to outside AI tools through the Model Context Protocol, offering chosen microflows as tools and prompts; without an authentication microflow anyone can reach it. [Documentation](https://docs.mendix.com/agents/agents-kit-2/reference-guide/mcp-modules/mcp-server/)

No module roles.

## `MxModelReflection`

Gives the running app a readable copy of its own entities, attributes and microflows, mostly to pick them in configuration pages. [Documentation](https://docs.mendix.com/appstore/modules/model-reflection/)

- **ModelAdministrator** (admin) — Creates and deletes the records of the model copy and opens its pages (the documentation gives it to the Administrator role). *(named in the documentation; what it may do read from a model at version 9.1.0)*
- **Readonly** — Reads the model copy. *(named in the documentation; what it may do read from a model at version 9.1.0)*
- **TokenUser** — Reads the model copy and creates and deletes tokens and test patterns. *(named in the documentation; what it may do read from a model at version 9.1.0)*

## `NanoflowCommons`

Common client-side actions for web and mobile — device storage, navigation, device features; what it keeps on the device is outside entity access. [Documentation](https://docs.mendix.com/appstore/modules/nanoflow-commons/)

- **User** — Full rights on two non-persistable entities (Geolocation, Position); no page or flow. *(not in the documentation; seen in a real model; what it may do read from a model at version 5.2.1)*

## `NativeMobileResources`

Widgets and actions for native and hybrid mobile apps. [Documentation](https://docs.mendix.com/appstore/modules/native-mobile-resources/)

- **User** — Full rights on two non-persistable entities (DeviceInfo, ImageMetaData); no page or flow. *(not in the documentation; seen in a real model; what it may do read from a model at version 10.1.17)*

## `OQL`

Lets microflows run free-form OQL queries and get rows, counts or a CSV file; the query is not checked and runs without entity access. [Documentation](https://docs.mendix.com/appstore/modules/oql-module/)

- **Administrator** (admin) — Runs OQL queries of its own on the example pages (ACT_ExecuteOQL). *(not in the documentation; seen in a real model; what it may do read from a model at version 4.0.0)*

## `PushNotifications`

Sends notifications to users’ phones and browsers when they are not using the app. [Documentation](https://docs.mendix.com/appstore/modules/push-notifications/)

- **Administrator** (admin) — Configures the messaging services and keys and manages registered devices. *(not in the documentation; seen in a real model; what it may do read from a model at version 8.0.3)*
- **User** — Registers its own device for notifications. *(not in the documentation; seen in a real model; what it may do read from a model at version 8.0.3)*
- **Anonymous** — Registers a device for notifications before signing in. *(not in the documentation; seen in a real model; what it may do read from a model at version 8.0.3)*

## `SAML20`

Single sign-on with SAML 2.0: users sign in at the organisation’s identity provider, and accounts can be created on first sign-in with a set user role. [Documentation](https://docs.mendix.com/appstore/modules/saml/)

- **Administrator** (admin) — Configures identity providers, keys, attribute mapping and user provisioning. *(not in the documentation; seen in a real model; what it may do read from a model at version 4.2.3)*
- **Admin_ReadSAMLEntities** — Reads the SAML configuration and log. *(not in the documentation; seen in a real model; what it may do read from a model at version 4.2.3)*

- CVE-2026-80465 (SSA-887643, 2026-09-03): Does not properly validate the SAML response signature, so in specific single sign-on configurations an attacker who has not signed in could take over an account — Mendix SAML (Mendix 9.24 compatible) below 3.6.27; Mendix SAML (Mendix 10 and Mendix 11 compatible) below 4.2.3. https://cert-portal.siemens.com/productcert/html/ssa-887643.html
- CVE-2025-40758 (SSA-395458, 2025-08-14): Does not enforce signature validation and binding checks strictly enough, so in specific single sign-on configurations an attacker who has not signed in could take over an account — Mendix SAML (Mendix 9.24 compatible) below 3.6.21; Mendix SAML (Mendix 10.12 compatible) below 4.0.3; Mendix SAML (Mendix 10.21 compatible) below 4.1.2. https://cert-portal.siemens.com/productcert/html/ssa-395458.html
- CVE-2023-29129 (SSA-851884, 2023-06-13): Verifies SAML assertions insufficiently in a specific non-default configuration (the incomplete fix of CVE-2023-25957), so an attacker who has not signed in could get past authentication — Mendix SAML (Mendix 7 compatible) from 1.16.4 below 1.18.0; Mendix SAML (Mendix 8 compatible) from 2.2.0 below 2.4.0; Mendix SAML (Mendix 9 latest compatible) from 3.1.8 below 3.6.1; Mendix SAML (Mendix 9.6 compatible) below 3.2.7; Mendix SAML (Mendix 9.12/9.18 compatible) below 3.3.15. https://cert-portal.siemens.com/productcert/html/ssa-851884.html
- CVE-2023-25957 (SSA-851884, 2023-03-14): Verifies SAML assertions insufficiently, so an attacker who has not signed in could get past authentication — Mendix SAML (Mendix 7 compatible) from 1.16.4 below 1.17.3; Mendix SAML (Mendix 8 compatible) from 2.2.0 below 2.3.0; Mendix SAML (Mendix 9 latest compatible) from 3.1.8 below 3.3.1; Mendix SAML (Mendix 9.6 compatible) below 3.2.7. https://cert-portal.siemens.com/productcert/html/ssa-851884.html

## `UserCommons`

The user provisioning shared by the OIDC, SAML and SCIM modules (no page of its own on docs.mendix.com). [Documentation](https://docs.mendix.com/appstore/modules/oidc/)

- **Administrator** (admin) — Configures user provisioning and claims (the OIDC documentation gives it to the Administrator role). *(named in the documentation; what it may do read from a model at version 2.4.0)*
- **Admin_ReadOnly** — Reads the provisioning configuration. *(not in the documentation; seen in a real model; what it may do read from a model at version 2.4.0)*

## `WebActions`

Small browser actions: move the focus, scroll to an element, take a picture with the camera. [Documentation](https://docs.mendix.com/appstore/modules/web-actions/)

No module roles.

## `ZipHandling`

Java actions to zip and unzip files (no page on docs.mendix.com). No page on docs.mendix.com.

- **User** — Nothing in the module’s pages, flows or entities. *(not in the documentation; seen in a real model; what it may do read from a model at version 5.0.2)*

## `OIDC`

Single sign-on with OpenID Connect; it can take user roles from the identity provider’s token and protect the app’s APIs with access tokens. [Documentation](https://docs.mendix.com/appstore/modules/oidc/)

- **Administrator** (admin) — Configures the identity providers on OIDC_Client_Overview. *(named in the documentation)*
- **User** — Signs in through OIDC. *(named in the documentation)*

- CVE-2025-40571 (SSA-726617, 2025-05-13): Gives the Administrator role read and write access to every token, which someone changing the module during development could misuse — Mendix OIDC SSO (Mendix 9 compatible) below 3.3.1; Mendix OIDC SSO (Mendix 10.12 compatible) below 4.0.1; Mendix OIDC SSO V4.2 (Mendix 10 compatible) below 4.2.1; Mendix OIDC SSO V4.3 (Mendix 10 compatible) — no fixed version. https://cert-portal.siemens.com/productcert/html/ssa-726617.html

## `LDAP`

Synchronises users, their groups and active state from a directory such as Active Directory, maps groups to user roles, and can require an LDAP sign-in. [Documentation](https://docs.mendix.com/appstore/modules/ldap/)

- **LdapAdmin** (admin) — Configures the directory connection, the synchronisation and the group-to-role mapping. *(named in the documentation)*

- CVE-2024-56841 (SSA-314390, 2025-01-14): Is open to LDAP injection, which lets someone who has not signed in get past the user name check — Mendix LDAP below 1.1.2. https://cert-portal.siemens.com/productcert/html/ssa-314390.html

## `ForgotPassword`

Self-service sign-up and password reset for local accounts by an emailed link. [Documentation](https://docs.mendix.com/appstore/modules/forgot-password/)

- **Administrator** (admin) — Sets the email template and deep link and sees open reset requests — the documentation says for the administrator only. *(named in the documentation)*
- **Guest_ResetPassword** — Asks for a password reset (for the guest and the signed-in user). *(named in the documentation)*
- **Guest_SignUp** — Signs up (for the guest). *(named in the documentation)*

- CVE-2023-43623 (SSA-295483, 2023-10-10): Answers differently for known and unknown users, so someone who has not signed in can tell which user names exist — Mendix Forgot Password (Mendix 7 compatible) below 3.7.3; Mendix Forgot Password (Mendix 8 compatible) below 4.1.3; Mendix Forgot Password (Mendix 9 and Mendix 10 compatible) below 5.4.0. https://cert-portal.siemens.com/productcert/html/ssa-295483.html
- CVE-2023-27464 (SSA-699404, 2023-04-11): Answers in an observably different way that could let an attacker retrieve sensitive information — Mendix Forgot Password (Mendix 7 compatible) below 3.7.1; Mendix Forgot Password (Mendix 8 compatible) below 4.1.1; Mendix Forgot Password (Mendix 9 compatible) below 5.1.1. https://cert-portal.siemens.com/productcert/html/ssa-699404.html
- CVE-2022-26313 (SSA-134279, 2022-03-08): Lets someone, in certain configurations, use the sign-up flow to take over any user’s account — Mendix Forgot Password Appstore module from 3.3.0 below 3.5.1. https://cert-portal.siemens.com/productcert/pdf/ssa-134279.pdf
- CVE-2022-26314 (SSA-134279, 2022-03-08): Generates initial passwords in an insecure way, so in specific situations someone who has not signed in could brute-force them efficiently — Mendix Forgot Password Appstore module from 3.3.0 below 3.5.1; Mendix Forgot Password Appstore module (Mendix 7 compatible) below 3.2.2. https://cert-portal.siemens.com/productcert/pdf/ssa-134279.pdf

## `WorkflowCommons`

A starting kit for workflows: a task inbox, dashboards, an admin centre and reassigning the tasks of people who leave. [Documentation](https://docs.mendix.com/appstore/modules/workflow-commons/)

- **Administrator** (admin) — Administers workflows, sees workflow and task performance and the workflow audit trail. *(named in the documentation)*
- **User** — Completes its user tasks, sees its own performance and follows the workflows it started. *(named in the documentation)*

- CVE-2022-46664 (SSA-210822, 2022-12-13): Handles access control on some of its entities wrongly, so a signed-in user could read or delete sensitive information — Mendix Workflow Commons below 2.4.0; Mendix Workflow Commons V2.1 below 2.1.4; Mendix Workflow Commons V2.3 below 2.3.2. https://cert-portal.siemens.com/productcert/pdf/ssa-210822.pdf
