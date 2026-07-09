name: "Question"
description: "Tanya jawab tentang tutorial atau Cloudflare setup"
title: "[QUESTION] "
labels: ["question"]
body:
  - type: textarea
    id: question
    attributes:
      label: Pertanyaan
    validations:
      required: true
  - type: textarea
    id: context
    attributes:
      label: Context (apa yang sudah kamu coba?)
