export function validateHtmlTags(content: string): {
  isValid: boolean;
  errors: string[];
  suggestions: string[];
  unclosedTags: string[];
  orphanedTags: string[];
};

export function fixHtmlTags(content: string): string;