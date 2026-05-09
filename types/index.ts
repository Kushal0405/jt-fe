export type Stage = 'saved' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'withdrawn';

export interface User {
  id: string;
  name: string;
  email: string;
  skills?: string[];
  targetRoles?: string[];
  targetLocations?: string[];
  expectedSalaryMin?: number;
  expectedSalaryMax?: number;
  defaultResume?: Resume;
}

export interface Company {
  _id: string;
  name: string;
  website?: string;
  linkedinUrl?: string;
  industry?: string;
  size?: string;
  location?: string;
  techStack?: string[];
  logoUrl?: string;
  isTargeted?: boolean;
  notes?: string;
}

export interface Job {
  _id: string;
  title: string;
  description?: string;
  company?: Company;
  companyName?: string;
  location?: string;
  locationType?: 'remote' | 'hybrid' | 'onsite';
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  experienceMin?: number;
  experienceMax?: number;
  skills?: string[];
  tags?: string[];
  source?: string;
  jdUrl?: string;
  isActive?: boolean;
  postedAt?: string;
  matchScore?: number;
}

export interface Activity {
  stage: Stage;
  note?: string;
  createdAt: string;
}

export interface Application {
  _id: string;
  job: Job;
  resume?: Resume;
  stage: Stage;
  appliedAt?: string;
  followUpAt?: string;
  coverLetter?: string;
  notes?: string;
  recruiterName?: string;
  recruiterEmail?: string;
  referralContact?: string;
  matchScore?: number;
  jobSnapshot?: {
    title: string;
    companyName: string;
    location: string;
    salaryMin?: number;
    salaryMax?: number;
  };
  activity?: Activity[];
  createdAt: string;
  updatedAt: string;
}

export interface Resume {
  _id: string;
  label: string;
  fileType: 'pdf' | 'docx';
  skills?: string[];
  experienceYears?: number;
  currentRole?: string;
  summary?: string;
  isDefault?: boolean;
  createdAt: string;
}

export interface MatchResult {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  recommendation: 'strong' | 'good' | 'partial' | 'weak';
  summary: string;
}

export interface DiscoveredJob {
  _id: string;
  externalId: string;
  title: string;
  company: string;
  location: string;
  description: string;
  applyLink: string;
  source: string;
  fetchedAt: string;
}

export interface PipelineSummary {
  saved: number;
  applied: number;
  screening: number;
  interview: number;
  offer: number;
  rejected: number;
  withdrawn: number;
}