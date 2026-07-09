name: "Bug Report"
description: "Report error/bug di tutorial atau example code"
title: "[BUG] "
labels: ["bug", "triage"]
body:
  - type: dropdown
    id: section
    attributes:
      label: Section yang bug
      options:
        - 📖 Tutorial doc (EN)
        - 📖 Tutorial doc (ID)
        - 🧪 Example code
        - 🔧 Deploy script
        - 📚 README/setup
      validations:
        required: true
  - type: dropdown
    id: severity
    attributes:
      label: Severity
      options:
        - 🟠 High (deploy broken, command wrong)
        - 🟡 Medium (typo, broken link)
        - 🟢 Low (improvement)
    validations:
      required: true
  - type: textarea
    id: description
    attributes:
      label: Deskripsi Bug
      placeholder: Jelaskan apa yang salah
    validations:
      required: true
  - type: textarea
    id: reproduction
    attributes:
      label: Reproduction Steps
      placeholder: |
        1. Run command...
        2. Expected: ...
        3. Actual: ...
    validations:
      required: true
  - type: input
    id: environment
    attributes:
      label: Environment (OS, Node version, Wrangler version)
