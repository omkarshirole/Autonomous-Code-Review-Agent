export interface AppPreferences {
  model: string;
  strictness: "relaxed" | "balanced" | "strict";
  instructions: string;
  disabledRules: string[];
  autoExpandFindings: boolean;
  showConfidence: boolean;
}

export interface UserProfile {
  name: string;
  username: string;
  email: string;
  role: string;
  company: string;
  location: string;
  bio: string;
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  model: "gpt-5.6-sol",
  strictness: "balanced",
  instructions: "",
  disabledRules: [],
  autoExpandFindings: true,
  showConfidence: true,
};

export const DEFAULT_PROFILE: UserProfile = {
  name: "Omkar Developer",
  username: "omkar",
  email: "developer@example.com",
  role: "Software Engineer",
  company: "Independent",
  location: "India",
  bio: "Building reliable software and reviewing every change with intent.",
};

export function loadStored<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? { ...fallback, ...JSON.parse(value) } : fallback;
  } catch {
    return fallback;
  }
}
