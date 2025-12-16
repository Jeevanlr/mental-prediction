// src/utils/symptoms.js

// Example list of symptoms with categories and conditions
export const SYMPTOMS = [
  { name: "sadness", category: "Mood" },
  { name: "anxiety", category: "Anxiety" },
  { name: "sleep_disturbance", category: "Sleep" },
  { name: "loss_of_interest", category: "Depression" },
  { name: "fatigue", category: "General" },
  { name: "difficulty_concentrating", category: "Cognitive" },
  { name: "social_isolation", category: "Social" },
  { name: "irritability", category: "Mood" },
  { name: "excessive_worry", category: "Anxiety" },
  { name: "low_energy", category: "General" },
];

// Helper function for filtering
export const getSymptomsByCategory = (category) => {
  return SYMPTOMS.filter((symptom) => symptom.category === category);
};
