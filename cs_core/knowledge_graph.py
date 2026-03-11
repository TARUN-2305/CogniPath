import networkx as nx
from sentence_transformers import SentenceTransformer, util
import numpy as np
from typing import List, Dict, Tuple, Optional, Union

class DomainKnowledgeGraph:
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
        """
        Initializes the Knowledge Graph and the Semantic Sentence Transformer embedding model.
        """
        self.graph = nx.DiGraph()
        # Load a lightweight, fast semantic embedding model
        # Using all-MiniLM-L6-v2 as requested for fast CPU/memory inference
        self.encoder = SentenceTransformer(model_name)
        
        # Cache for node embeddings to avoid re-computing
        self.node_embeddings = {}
        self.node_texts = []
        self.node_ids = []

    def ingest_curriculum_triplets(self, triplets: List[Tuple[str, str, str]]):
        """
        Ingests entity-relation triplets (Source, Relation, Target) to build the NetworkX graph.
        In a full pipeline, these would be extracted from a curriculum text via an IE LLM.
        """
        for source, relation, target in triplets:
            self.graph.add_edge(source, target, relation=relation)
            
        # Pre-compute embeddings for all nodes in the graph
        self._compute_node_embeddings()

    def _compute_node_embeddings(self):
        """
        Internal function to embed all concepts in the Knowledge Graph for O(1) semantic lookups.
        """
        self.node_ids = list(self.graph.nodes())
        if not self.node_ids:
            return
            
        # In a real scenario, nodes might have extended descriptions. Here we just use the ID string.
        self.node_texts = self.node_ids 
        
        # Compute embeddings en masse
        embeddings = self.encoder.encode(self.node_texts, convert_to_tensor=True)
        
        for i, node_id in enumerate(self.node_ids):
            self.node_embeddings[node_id] = embeddings[i]

    def map_step_to_concept(self, student_step_text: str, top_k: int = 1) -> List[Dict[str, Union[str, float]]]:
        """
        Performs semantic search to map a student's unstructured thought step to the closest 
        canonical concept node in the localized Knowledge Graph.
        
        Args:
            student_step_text: The extracted step text from Stage 1.
            top_k: Number of closest matches to return.
            
        Returns:
            A list of dicts with 'concept_node' and 'similarity_score'.
        """
        if not self.node_ids:
            raise ValueError("Knowledge Graph is empty. Please ingest triplets first.")
            
        # Encode the student's step
        step_embedding = self.encoder.encode(student_step_text, convert_to_tensor=True)
        
        # Batch convert cached node embeddings to a tensor
        corpus_embeddings = self.encoder.encode(self.node_texts, convert_to_tensor=True)

        # Compute cosine similarities
        cos_scores = util.cos_sim(step_embedding, corpus_embeddings)[0]
        
        # Find the top_k scores (handle case where top_k > len(cos_scores))
        k = min(top_k, len(cos_scores))
        top_results = np.argpartition(-cos_scores.cpu(), range(k))[:k]
        
        results = []
        for idx in top_results:
             results.append({
                 "concept_node": self.node_ids[idx],
                 "similarity_score": float(cos_scores[idx])
             })
            
        # Sort by similarity descending
        return sorted(results, key=lambda x: x["similarity_score"], reverse=True)

    def is_valid_trajectory(self, concept_a: str, concept_b: str) -> bool:
        """
        Checks if the student's jump from Concept A to Concept B is a valid edge
        in the Domain Knowledge Graph.
        
        Returns True if a path exists, False if it's a "Missing Step" hallucination.
        """
        if concept_a not in self.graph or concept_b not in self.graph:
            return False
            
        # Check if there's a directed path (ignoring weight/distance for now)
        try:
            return nx.has_path(self.graph, concept_a, concept_b)
        except nx.NetworkXNoPath:
            return False

# Example usage for physics kinematics:
if __name__ == "__main__":
    kg = DomainKnowledgeGraph()
    dummy_triplets = [
        ("Free Fall Concept", "requires", "Gravity Assumption"),
        ("Gravity Assumption", "leads_to", "Conservation of Energy"),
        ("Conservation of Energy", "allows_derivation_of", "Velocity formula (v = sqrt(2gh))"),
        ("Velocity formula (v = sqrt(2gh))", "computes", "Final Velocity Calculation"),
        ("Distance / Time formula", "requires", "Constant Velocity Concept"), # The Bluff Path
    ]
    
    print("Ingesting triplets and building graph...")
    kg.ingest_curriculum_triplets(dummy_triplets)
    
    print("\\mapping Student Steps to Graph:")
    student_step = "Applies mgh = 1/2 mv^2 to solve the problem."
    mapping = kg.map_step_to_concept(student_step)
    print(f"Step: '{student_step}'\\nMapped to: {mapping}")
    
    student_bluff = "I can just divide distance by time."
    mapping2 = kg.map_step_to_concept(student_bluff)
    print(f"Step: '{student_bluff}'\\nMapped to: {mapping2}")
