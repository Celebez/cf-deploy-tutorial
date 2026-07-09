name: "Security Report"
description: "🔒 Report vulnerability (PRIVATE — prefer email)"
title: "[SECURITY] "
labels: ["security", "priority: high"]
body:
  - type: markdown
    attributes:
      value: |
        ⚠️ **For sensitive vulnerabilities, email maintainer directly. Don't use this issue.**
        Lihat SECURITY.md untuk contact email.
  - type: textarea
    id: description
    attributes:
      label: Vulnerability description
    validations:
      required: true
  - type: textarea
    id: impact
    attributes:
      label: Impact
