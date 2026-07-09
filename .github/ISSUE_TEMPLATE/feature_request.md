name: "Feature Request"
description: "Suggest new tutorial section / example / improvement"
title: "[FEAT] "
labels: ["enhancement"]
body:
  - type: textarea
    id: problem
    attributes:
      label: Problem / Kebutuhan
    validations:
      required: true
  - type: textarea
    id: solution
    attributes:
      label: Solusi yang diusulkan
    validations:
      required: true
  - type: dropdown
    id: type
    attributes:
      label: Tipe Konten
      options:
        - 📖 Tutorial section baru
        - 🧪 Example code baru
        - 🔧 Deploy script/tool
        - 🌐 Translation (EN ↔ ID)
        - 📚 Doc improvement
