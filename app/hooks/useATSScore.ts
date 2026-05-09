'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { atsApi } from '@/lib/api';

export interface ATSResult {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
}

/**
 * Lazily computes an ATS compatibility score between a job description and a CV.
 * The API call is deferred until the returned `ref` element scrolls into view.
 *
 * @param jobDescription - Full text of the job description
 * @param userCV         - Raw text of the candidate's CV / resume
 */
export function useATSScore(jobDescription: string, userCV: string) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Fire only once when the card enters the viewport
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const enabled = isVisible && !!jobDescription?.trim() && !!userCV?.trim();

  // Use first 200 chars of each as a stable cache key (avoids giant query keys)
  const jdKey = jobDescription.trim().slice(0, 200);
  const cvKey = userCV.trim().slice(0, 200);

  const { data, isLoading, isError } = useQuery<ATSResult>({
    queryKey: ['ats-score', jdKey, cvKey],
    queryFn: async () => {
      const { data } = await atsApi.score(jobDescription, userCV);
      return data as ATSResult;
    },
    enabled,
    staleTime: Infinity,   // score for a given JD+CV never changes
    gcTime: 15 * 60_000,
    retry: 1,
  });

  return {
    /** Attach this ref to the card's root element to trigger lazy loading */
    ref,
    score: data?.score ?? null,
    matchedKeywords: data?.matchedKeywords ?? [],
    missingKeywords: data?.missingKeywords ?? [],
    /** True only while the card is visible and the request is in flight */
    isLoading: enabled && isLoading,
    isError,
  };
}
