name: Pull Request
body:
  - type: dropdown
    id: type
    attributes:
      label: Type of Change
      options:
        - 🐛 Bug fix
        - ✨ New tutorial/example
        - 📚 Documentation
        - 🌐 Translation
        - 🎨 Style/format
        - 🔧 Tool/script
    validations:
      required: true
  - type: dropdown
    id: language
    attributes:
      label: Bahasa
      options:
        - 🇬🇧 English only
        - 🇮🇩 Indonesian only
        - 🌍 Both (EN + ID) — WAJIB untuk content baru
    validations:
      required: true
  - type: textarea
    id: description
    attributes:
      label: Deskripsi Perubahan
    validations:
      required: true
  - type: textarea
    id: testing
    attributes:
      label: Cara Test
    validations:
      required: true
  - type: checkboxes
    id: checklist
    attributes:
      label: Checklist
      options:
        - label: Tested locally (deploy/command sukses)
        - label: No secrets/keys/tokens committed
        - label: Bilingual parity maintained (jika applicable)
        - label: Related docs updated
