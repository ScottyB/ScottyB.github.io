+++
menu = "main"
title = "Publications"
type = "about"
weight = 10
+++

My full list of papers are available on [Google Scholar](https://scholar.google.com.au/citations?user=PJcpaRAAAAAJ&hl=en&oi=ao).

### Key works:

[**1. Seven Failure Points When Engineering a Retrieval Augmented Generation System**](https://arxiv.org/pdf/2401.05856)


Lays the foundation for building robust LLM applications by presenting 7 failure
points when using LLMs for information retrieval (RAG systems). Provides a basis
for identifying research problems in this space and presents lessons learned.

**Quote from the paper**
- *"Validation of a RAG system is only feasible during operation, and the robustness of a RAG system evolves rather than designed in at the start."*

[**2. RAGProbe: An Automated Approach for Evaluating RAG Applications**](https://arxiv.org/pdf/2309.01379)

Builds upon the failure points paper by presenting evaluation scenarios, a
systematic and automated method for evaluating RAG systems. The purpose of this
work is to provide an automated way to do domain specific evaluation of RAG
systems.

**Quote from the paper:**
- *"RAGProbe found more failures (between 45-83% per RAG pipeline, 180 questions) as compared to state-of-the-art."*

[**3. Evaluating LLMs on document-based QA: Exact answer selection and numerical extraction using CogTale dataset**](https://arxiv.org/pdf/2311.07878)

Explores the impact a domain has on a RAG system through a case study. This
paper highlights that generic evaluation approaches are insufficient compared to
human annotations for a narrow domain. However, the annotation schema was
designed by humans for humans not machines.

**Quote from the paper:**
- *"We found that LLMs, particularly GPT-4, can precisely answer many single-choice
and yes-no questions given relevant context, demonstrating their efficacy in information retrieval tasks. However, their performance
diminishes when confronted with multiple-choice and number extraction formats, lowering the overall performance of the model
on this task, indicating that these models may not yet be sufficiently reliable for the task."*

[**4. LLMs for Test Input Generation for Semantic Applications**](https://dl.acm.org/doi/10.1145/3644815.3644948)

Presents VaryGen a tool to generate semantically similar data automatically. The
key idea was to generate semantically similar text without using similarity
measures such as cosine similarity. This was to avoid the problems with
embeddings representing a static concept of semantic relatedness. Precursor to RAGProbe.

[**5. Mlguard: Defend your machine learning model!**](https://arxiv.org/pdf/2309.01379)

The key idea here is to adapt the concept of design by contract to machine
learning based systems. Contracts could provide useful but are dependent on
knowing what to monitor and how to monitor the ML model. Without that
information knowing how to set the contracts is challenging.
