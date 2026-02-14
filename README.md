# Claudiv

### *Claude in a Div*

> **Conversational UI Development with Claude** - Build web applications by describing what you want, not how to code it.

**Claudiv** is a revolutionary development framework that transforms XML-like specifications into working web applications through natural conversations with Claude AI. Instead of writing code, you describe your UI in simple, freeform tags and let Claude handle the implementation.

## ✨ What Makes Claudiv Special

- 🗣️ **Conversational Development** - Describe your UI naturally, Claude generates the code
- 🏗️ **Freeform Structure** - Use ANY tag names - no conventions to learn
- 🎯 **Attribute-Based Actions** - Just add `gen=""` to trigger AI generation
- 🔒 **Selective Regeneration** - Lock what works, regenerate what needs improvement
- 🔥 **Hot Reload** - See changes instantly in your browser
- 🌳 **Hierarchical Context** - Nested structure automatically provides AI context
- 📝 **Living Specification** - Your spec.html is the source of truth, not the generated code

## 🚀 Quick Start

```bash
# Install
npm install -g claudiv

# Create a spec.html file
echo '<app><button gen="">Make a blue button</button></app>' > spec.html

# Start development
claudiv
```

Your browser opens at `http://localhost:30006` with a working blue button. **That's it.**

## 💡 How It Works

### 1. Write Specifications, Not Code

```xml
<app>
  <hero-section gen="">
    Create a hero section with gradient background,
    large heading "Welcome to the Future",
    and a call-to-action button
  </hero-section>
</app>
```

### 2. Claude Generates Implementation

Claudiv sends your specification to Claude, which generates complete HTML/CSS code and updates your browser automatically.

### 3. Iterate Naturally

```xml
<app>
  <hero-section lock="">
    <!-- Already perfect, keep this -->
  </hero-section>

  <features-grid gen="">
    Add a 3-column grid showcasing key features
    with icons and descriptions
  </features-grid>
</app>
```

Lock what works, regenerate what needs improvement. **No manual code editing required.**

## 🎯 Core Concepts

### Freeform Tag Names

Use **any** tag name that makes sense to you:

```xml
<user-dashboard gen="">
<pricing-table gen="">
<testimonial-carousel gen="">
<contact-form gen="">
```

Tag names help you organize and help Claude understand intent.

### Attributes as Specifications

Provide structured specifications via attributes:

```xml
<button
  color="blue"
  size="large"
  icon="checkmark"
  action="submit-form"
  gen="">
</button>
```

Claude uses these to guide implementation.

### Action Attributes

- `gen=""` - Generate new implementation
- `retry=""` - Regenerate with same specs
- `undo=""` - Revert previous change
- `lock=""` - Prevent children from regeneration
- `unlock=""` - Override parent lock

### Lock/Unlock System

Perfect for iterative development:

```xml
<!-- Lock everything, regenerate only header -->
<website lock="" gen="">
  <header unlock="">
    Update header with sticky navigation
  </header>
  <sidebar>Stays locked</sidebar>
  <content>Stays locked</content>
</website>
```

## 🎨 Real-World Example

```xml
<app theme="dark">
  <!-- Navigation -->
  <nav-menu dock="left" styling="professional compact" gen="">
    <pages>
      <home>Home</home>
      <gallery>Gallery</gallery>
      <about>About</about>
    </pages>
  </nav-menu>

  <!-- Main Content -->
  <pages gen="">
    <home content="classic home">
      Hero section with welcome message,
      3 feature cards highlighting benefits,
      testimonials section with 4 reviews
    </home>

    <gallery layout="grid" columns="3">
      Photo gallery with hover effects,
      lightbox on click, responsive grid
    </gallery>
  </pages>
</app>
```

**Result**: Complete, working website with navigation, pages, and all features implemented.

## 📚 Documentation

- **[Getting Started Guide](FEATURES-SUMMARY.md)** - Complete feature overview
- **[Attribute Syntax](ATTRIBUTE-SYNTAX.md)** - Full syntax reference
- **[Lock/Unlock Guide](LOCK-UNLOCK-GUIDE.md)** - Selective regeneration patterns
- **[Schema Guide](SCHEMA-GUIDE.md)** - IDE autocomplete setup

## ⚙️ Configuration

### Two Modes Available

**CLI Mode** (uses Claude Code subscription):
```bash
MODE=cli claudiv
```

**API Mode** (pay-per-use):
```env
# .env file
MODE=api
ANTHROPIC_API_KEY=sk-ant-...
```

### IDE Support

Install the **Red Hat XML** extension in VS Code for:
- Autocomplete for all attributes
- Documentation on hover
- Real-time validation

See [SCHEMA-GUIDE.md](SCHEMA-GUIDE.md) for setup instructions.

## 🔥 Advanced Features

### Nested Component Specifications

All nested elements are automatically implemented:

```xml
<dashboard gen="">
  <header>App header with logo and user menu</header>
  <sidebar>
    <nav-links>Dashboard, Analytics, Settings</nav-links>
  </sidebar>
  <main-content>
    <stats-cards count="4">Revenue, Users, Sales, Growth</stats-cards>
    <chart type="line">Monthly revenue chart</chart>
  </main-content>
</dashboard>
```

**Every** nested element gets a complete implementation.

### Iterative Development Workflow

```xml
<!-- Step 1: Generate everything -->
<app gen="">
  <header>...</header>
  <sidebar>...</sidebar>
  <main>...</main>
</app>

<!-- Step 2: Lock header, improve sidebar -->
<app retry="">
  <header lock="">Perfect!</header>
  <sidebar>Better navigation layout</sidebar>
  <main lock="">Keep this</main>
</app>

<!-- Step 3: Lock everything, update theme -->
<app theme="dark" lock="" retry="">
  <header unlock="">Update with dark theme</header>
</app>
```

### Structured AI Responses

Claude responds with semantic XML:

```xml
<ai>
  <changes>Created responsive dashboard with 4 stat cards</changes>
  <details>
    <layout>Flexbox layout with responsive breakpoints</layout>
    <styling>Modern card design with shadows and hover effects</styling>
    <theme>Dark mode support via CSS variables</theme>
  </details>
  <summary>Complete dashboard implementation...</summary>
</ai>
```

## 🎯 Use Cases

### Rapid Prototyping
Describe UIs in natural language, get working prototypes instantly.

### Design Iteration
Lock components that work, iterate on specific sections.

### Learning & Exploration
See how AI implements your ideas, learn patterns and techniques.

### Living Documentation
spec.html serves as both specification and documentation.

## 🛠️ Commands

```bash
# Development mode (with hot reload)
claudiv
# or
npm run dev

# Build TypeScript
npm run build

# CLI mode explicitly
npm run dev:cli

# API mode explicitly
npm run dev:api
```

## 📦 What Gets Generated

- **spec.html** - Your specifications (edit this)
- **spec.code.html** - Generated HTML/CSS (browser-ready)
- **spec.xsd** - XML Schema for IDE autocomplete
- **.vscode/settings.json** - IDE configuration

## 🌟 Why Claudiv?

Traditional development:
1. Design mockups
2. Write HTML structure
3. Write CSS styling
4. Write JavaScript behavior
5. Debug and refine
6. Repeat for every component

**Claudiv development:**
1. Describe what you want
2. ✨ *Everything else happens automatically*

## 🤝 Contributing

Claudiv is open source and welcomes contributions!

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Links

- **GitHub**: [claudiv](https://github.com/claudiv-ai/claudiv)
- **Documentation**: [Full docs](FEATURES-SUMMARY.md)
- **Claude Code**: [https://code.claude.com](https://code.claude.com)

---

**Built with ❤️ for developers who want to focus on what to build, not how to code it.**

*Claudiv - Where conversation meets creation.*
