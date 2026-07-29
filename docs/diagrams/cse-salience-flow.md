# EVS-10: Contextual Salience Engine - Flow Diagram

## CSE Selection Flow

```mermaid
graph TD
    A[Runtime Execute] --> B{CSE Enabled?}
    B -->|No| C[No CSE Evidence]
    B -->|Yes| D[Load Active Decisions]
    
    D --> E{Count > maxItems?}
    E -->|No| F[No Pressure - Pass All]
    E -->|Yes| G[Apply CSE Selection]
    
    G --> H[Compute Salience for Each]
    H --> I[Sort by Salience Descending]
    I --> J[Select Top-N]
    J --> K[Generate CSE Evidence]
    
    K --> L[Add to Trace]
    F --> L
    C --> L
    
    L --> M[Return Trace]
    
    style G fill:#4CAF50
    style H fill:#2196F3
    style I fill:#2196F3
    style J fill:#FF9800
    style K fill:#9C27B0
```

## Salience Computation

```mermaid
graph LR
    A[Decision] --> B[Extract Timestamp]
    A --> C[Extract Importance]
    
    B --> D[Calculate Recency Score]
    C --> E[Importance Score]
    
    D --> F[recencyScore = e^-ageHours/168]
    E --> G[importanceScore = metadata.importance]
    
    F --> H[Weighted Sum]
    G --> H
    
    H --> I[salience = 0.4 * recency + 0.6 * importance]
    
    I --> J[Final Salience Score]
    
    style D fill:#4CAF50
    style E fill:#4CAF50
    style H fill:#FF9800
    style I fill:#2196F3
    style J fill:#9C27B0
```

## Shuffle Invariance Proof

```mermaid
graph TD
    A[10 Decisions Created] --> B[Canonical Order]
    A --> C[Shuffled Order]
    
    B --> D[CSE Selection Run 1]
    C --> E[CSE Selection Run 2]
    
    D --> F[selectedIds: DR-010, DR-009, DR-008]
    E --> G[selectedIds: DR-010, DR-009, DR-008]
    
    F --> H{IDs Match?}
    G --> H
    
    H -->|Yes| I[✅ Shuffle Invariance Proven]
    H -->|No| J[❌ Order-Dependent Selection]
    
    style A fill:#9E9E9E
    style B fill:#2196F3
    style C fill:#2196F3
    style D fill:#4CAF50
    style E fill:#4CAF50
    style I fill:#4CAF50
    style J fill:#F44336
```

## Pressure Handling

```mermaid
graph TD
    A[50 Candidates] --> B[CSE Enabled]
    B --> C[maxItems = 5]
    
    C --> D[Compute Salience for All 50]
    D --> E[Sort by Salience]
    
    E --> F[Top 5 Highest Salience]
    E --> G[Remaining 45 Discarded]
    
    F --> H[Selected Items]
    G --> I[Not Selected]
    
    H --> J[trace.cse_evidence.selectedIds]
    H --> K[trace.cse_evidence.highestSalience]
    H --> L[trace.cse_evidence.lowestSalience]
    
    style A fill:#9E9E9E
    style D fill:#2196F3
    style E fill:#2196F3
    style F fill:#4CAF50
    style G fill:#F44336
    style J fill:#9C27B0
```

## PCS-OFF Control

```mermaid
graph TD
    A[Runtime Execute] --> B{CSE Enabled?}
    
    B -->|Yes PCS-ON| C[CSE Selection Applied]
    B -->|No PCS-OFF| D[No CSE Selection]
    
    C --> E[trace.cse_evidence Present]
    D --> F[trace.cse_evidence Absent]
    
    E --> G[✅ Runtime-Controlled]
    F --> G
    
    style B fill:#FF9800
    style C fill:#4CAF50
    style D fill:#9E9E9E
    style E fill:#2196F3
    style F fill:#9E9E9E
    style G fill:#4CAF50
```

## Guardrails Enforcement

```mermaid
graph TD
    A[Test Start] --> B[Run Guardrail G0]
    B --> C{Banned Imports?}
    
    C -->|Yes| D[❌ FAIL: CSE Reimplementation]
    C -->|No| E[Run Guardrail G1]
    
    E --> F{Harness Salience Computation?}
    F -->|Yes| G[❌ FAIL: Harness Computing Salience]
    F -->|No| H[✅ Guardrails Passed]
    
    H --> I[Run Test Phases]
    
    style B fill:#2196F3
    style C fill:#FF9800
    style D fill:#F44336
    style E fill:#2196F3
    style F fill:#FF9800
    style G fill:#F44336
    style H fill:#4CAF50
    style I fill:#4CAF50
```

## Audit Trail Generation

```mermaid
graph TD
    A[Test Complete] --> B[Save Phase Traces]
    B --> C[phase1-trace.json]
    B --> D[phase1-shuffled-trace.json]
    B --> E[phase2-trace.json]
    B --> F[phase3-trace.json]
    B --> G[pcs-off-trace.json]
    
    C --> H[Generate Manifest]
    D --> H
    E --> H
    F --> H
    G --> H
    
    H --> I[MANIFEST.sha256]
    I --> J[SHA256 Hash Each File]
    
    A --> K[Generate Summary]
    K --> L[SUMMARY.txt]
    L --> M[Git Commit + Timestamp]
    
    style B fill:#2196F3
    style H fill:#FF9800
    style I fill:#9C27B0
    style K fill:#FF9800
    style L fill:#9C27B0
```

---

## Legend

- **Green**: Success / Selection / Proof
- **Blue**: Processing / Computation
- **Orange**: Decision Point / Configuration
- **Purple**: Evidence / Output
- **Red**: Failure / Discard
- **Grey**: Input / Neutral State
