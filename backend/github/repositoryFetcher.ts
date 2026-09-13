/**
 * Repository Fetcher
 * Downloads prioritized source files, sanitizes secrets, manages file caching,
 * and provides rich preset sample repositories for instant testing.
 */

import { fetchRepoMetadata, fetchRepoTree, fetchRecentCommits, parseGitHubUrl, GitHubRepoMetadata, GitHubCommitItem } from './githubService';
import { isAnalyzableFile, categorizeFile, sanitizeSecrets, CategorizedFile } from './fileFilter';

export interface FetchedFile {
  path: string;
  category: string;
  content: string;
  sizeBytes: number;
}

export interface IngestedRepository {
  id: string;
  name: string;
  owner: string;
  url: string;
  metadata: GitHubRepoMetadata;
  commits: GitHubCommitItem[];
  allFilePaths: string[];
  analyzedFiles: FetchedFile[];
  summary: {
    totalFiles: number;
    analyzedCount: number;
    categories: Record<string, number>;
  };
  fetchedAt: string;
}

// In-memory cache to prevent repeated rate-limit hits
const repoCache = new Map<string, IngestedRepository>();

/**
 * Fetches raw content of a file from GitHub
 */
async function fetchRawFileContent(owner: string, repo: string, branch: string, path: string): Promise<string | null> {
  try {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${encodeURI(path)}`;
    const res = await fetch(rawUrl, {
      headers: {
        'User-Agent': 'ITCareerHub-Repo-Assessment/1.0',
      },
    });

    if (!res.ok) return null;
    const text = await res.text();
    // Scrub potential secrets immediately
    return sanitizeSecrets(text);
  } catch {
    return null;
  }
}

/**
 * Main function to fetch and digest a GitHub repository
 */
export async function fetchAndProcessRepository(repoUrl: string, maxFilesToFetch = 25): Promise<IngestedRepository> {
  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) {
    throw new Error('Invalid GitHub URL. Please provide a valid repository URL (e.g. https://github.com/owner/repo).');
  }

  const cacheKey = parsed.fullName.toLowerCase();
  const cached = repoCache.get(cacheKey);
  if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < 1000 * 60 * 30) {
    // 30 minute cache hit
    return cached;
  }

  // 1. Fetch metadata
  const metadata = await fetchRepoMetadata(parsed.owner, parsed.repo);
  const branch = parsed.branch || metadata.defaultBranch || 'main';

  // 2. Fetch git tree
  const tree = await fetchRepoTree(parsed.owner, parsed.repo, branch);

  // 3. Fetch recent commits
  const commits = await fetchRecentCommits(parsed.owner, parsed.repo, 10);

  // 4. Filter and prioritize files
  const validFiles: CategorizedFile[] = [];
  const allFilePaths: string[] = [];

  for (const item of tree) {
    if (item.type === 'blob') {
      allFilePaths.push(item.path);
      if (isAnalyzableFile(item.path)) {
        // Skip files larger than 120KB
        if (!item.size || item.size <= 120 * 1024) {
          validFiles.push(categorizeFile(item.path));
        }
      }
    }
  }

  // Sort by importance (1 is highest: manifests, readme, auth, routes, models)
  validFiles.sort((a, b) => a.importance - b.importance);

  // Select top prioritized files to fetch
  const filesToFetch = validFiles.slice(0, maxFilesToFetch);
  const analyzedFiles: FetchedFile[] = [];
  const categoryCounts: Record<string, number> = {};

  // Fetch file contents in parallel batches of 5 to avoid congestion
  const batchSize = 5;
  for (let i = 0; i < filesToFetch.length; i += batchSize) {
    const batch = filesToFetch.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (f) => {
        const content = await fetchRawFileContent(parsed.owner, parsed.repo, branch, f.path);
        return { file: f, content };
      })
    );

    for (const res of results) {
      if (res.content && res.content.trim().length > 0) {
        analyzedFiles.push({
          path: res.file.path,
          category: res.file.category,
          content: res.content,
          sizeBytes: res.content.length,
        });
        categoryCounts[res.file.category] = (categoryCounts[res.file.category] || 0) + 1;
      }
    }
  }

  const ingested: IngestedRepository = {
    id: `repo_${parsed.owner}_${parsed.repo}`.replace(/[^a-zA-Z0-9_]/g, '_'),
    name: metadata.name,
    owner: parsed.owner,
    url: parsed.url,
    metadata,
    commits,
    allFilePaths,
    analyzedFiles,
    summary: {
      totalFiles: allFilePaths.length,
      analyzedCount: analyzedFiles.length,
      categories: categoryCounts,
    },
    fetchedAt: new Date().toISOString(),
  };

  repoCache.set(cacheKey, ingested);
  return ingested;
}

/**
 * Built-in Preset Sample Repositories
 * Allows instant testing for candidates even if offline or avoiding GitHub API limits.
 */
export const SAMPLE_REPOSITORIES = [
  {
    id: 'sample_ecommerce_next_mongo',
    name: 'techstore-ecommerce-platform',
    owner: 'alexdev',
    url: 'https://github.com/alexdev/techstore-ecommerce-platform',
    description: 'Full-stack production e-commerce platform with Next.js 14 App Router, MongoDB Atlas, Stripe checkout, JWT auth & inventory management.',
    primaryLanguage: 'TypeScript',
    stars: 245,
    sampleFiles: [
      {
        path: 'package.json',
        category: 'MANIFEST',
        content: JSON.stringify({
          name: 'techstore-ecommerce-platform',
          version: '1.0.0',
          dependencies: {
            next: '^14.2.0',
            react: '^18.3.0',
            'react-dom': '^18.3.0',
            mongoose: '^8.3.1',
            jsonwebtoken: '^9.0.2',
            bcryptjs: '^2.4.3',
            stripe: '^15.4.0',
            zustand: '^4.5.2',
            zod: '^3.23.0',
            tailwindcss: '^3.4.1',
          },
          devDependencies: {
            typescript: '^5.4.5',
            jest: '^29.7.0',
            '@types/node': '^20.12.7'
          }
        }, null, 2)
      },
      {
        path: 'src/models/User.ts',
        category: 'MODEL',
        content: `import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  role: 'customer' | 'admin';
  orders: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
  orders: [{ type: Schema.Types.ObjectId, ref: 'Order' }],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);`
      },
      {
        path: 'src/middleware/authMiddleware.ts',
        category: 'AUTH',
        content: `import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export function middleware(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value || req.headers.get('authorization')?.split(' ')[1];
  
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized: Missing session token' }, { status: 401 });
  }

  try {
    const secret = process.env.JWT_SECRET || 'secret';
    const decoded = jwt.verify(token, secret) as { userId: string; role: string };
    
    // Attach user role header to forward to backend API routes
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-id', decoded.userId);
    requestHeaders.set('x-user-role', decoded.role);
    
    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch (err) {
    return NextResponse.json({ error: 'Unauthorized: Invalid or expired token' }, { status: 401 });
  }
}`
      },
      {
        path: 'src/app/api/orders/checkout/route.ts',
        category: 'ROUTE',
        content: `import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import User from '@/models/User';
import Order from '@/models/Order';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' });

export async function POST(req: Request) {
  try {
    const { items, customerEmail, userId } = await req.json();
    
    // Validate stock and calculate line items
    const line_items = items.map((item: any) => ({
      price_data: {
        currency: 'usd',
        product_data: { name: item.name },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: \`\${process.env.NEXT_PUBLIC_URL}/order/success?session_id={CHECKOUT_SESSION_ID}\`,
      cancel_url: \`\${process.env.NEXT_PUBLIC_URL}/cart\`,
      metadata: { userId, orderItems: JSON.stringify(items) },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}`
      },
      {
        path: 'README.md',
        category: 'DOCS',
        content: `# TechStore E-Commerce Platform
A high-performance modern web application built with Next.js 14 App Router, MongoDB Atlas, and Stripe.

## Features
- **Stateless JWT Authentication**: HTTP-only cookie-based authentication with role-based access control (Admin & Customer).
- **Cart & State Management**: Zustand persistent storage with optimistic cart updates.
- **Stripe Checkout**: Webhook-verified payment workflow and order fulfillment.
- **MongoDB Atlas**: Document schemas for Users, Products, and Orders with compound indexes on product categories.`
      }
    ]
  },
  {
    id: 'sample_fastapi_postgres_microservice',
    name: 'payment-gateway-service',
    owner: 'fintech-core',
    url: 'https://github.com/fintech-core/payment-gateway-service',
    description: 'High-throughput async payment routing microservice built with Python 3.11, FastAPI, SQLAlchemy ORM, PostgreSQL, Redis idempotency caching, and Docker.',
    primaryLanguage: 'Python',
    stars: 512,
    sampleFiles: [
      {
        path: 'requirements.txt',
        category: 'MANIFEST',
        content: `fastapi==0.110.0
uvicorn[standard]==0.29.0
pydantic==2.6.4
sqlalchemy==2.0.29
asyncpg==0.29.0
alembic==1.13.1
redis==5.0.3
celery==5.3.6
pytest==8.1.1
httpx==0.27.0`
      },
      {
        path: 'app/models/transaction.py',
        category: 'MODEL',
        content: `from sqlalchemy import Column, String, Float, DateTime, Enum, Index
from sqlalchemy.orm import declarative_base
import enum
from datetime import datetime

Base = declarative_base()

class TransactionStatus(str, enum.Enum):
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String(36), primary_key=True, index=True)
    idempotency_key = Column(String(64), unique=True, index=True, nullable=False)
    account_id = Column(String(36), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="USD")
    status = Column(Enum(TransactionStatus), default=TransactionStatus.PENDING)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_account_status_created", "account_id", "status", "created_at"),
    )`
      },
      {
        path: 'app/api/v1/endpoints/payments.py',
        category: 'ROUTE',
        content: `from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.payment import PaymentRequest, PaymentResponse
from app.services.payment_service import PaymentService
from app.core.database import get_db

router = APIRouter(prefix="/payments", tags=["payments"])

@router.post("/process", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def process_payment(
    request: PaymentRequest,
    idempotency_key: str = Header(..., alias="X-Idempotency-Key"),
    db: AsyncSession = Depends(get_db)
):
    service = PaymentService(db)
    result = await service.process_transaction(request, idempotency_key)
    if not result.success:
        raise HTTPException(status_code=400, detail=result.error_message)
    return result`
      },
      {
        path: 'Dockerfile',
        category: 'CONFIG',
        content: `FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]`
      },
      {
        path: 'README.md',
        category: 'DOCS',
        content: `# Async Payment Gateway Microservice
High-throughput payment orchestration engine.

## Architecture
- **FastAPI Async Routes**: Native asyncio concurrency for non-blocking I/O.
- **SQLAlchemy 2.0 AsyncPG**: Connection pool with PostgreSQL for ACID compliance.
- **Redis Idempotency**: Distributed locks to ensure zero duplicate charges during network retries.`
      }
    ]
  },
  {
    id: 'sample_springboot_java_banking',
    name: 'enterprise-core-banking-api',
    owner: 'enterprise-systems',
    url: 'https://github.com/enterprise-systems/enterprise-core-banking-api',
    description: 'Enterprise Banking REST API built with Java 17, Spring Boot 3, Spring Security, Hibernate JPA, PostgreSQL, and Flyway database migrations.',
    primaryLanguage: 'Java',
    stars: 380,
    sampleFiles: [
      {
        path: 'pom.xml',
        category: 'MANIFEST',
        content: `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.banking.core</groupId>
    <artifactId>banking-api</artifactId>
    <version>2.1.0</version>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-core</artifactId>
        </dependency>
    </dependencies>
</project>`
      },
      {
        path: 'src/main/java/com/banking/controller/AccountController.java',
        category: 'CONTROLLER',
        content: `package com.banking.controller;

import com.banking.service.AccountService;
import com.banking.dto.TransferRequest;
import com.banking.dto.AccountBalanceResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/accounts")
public class AccountController {

    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @PostMapping("/transfer")
    public ResponseEntity<?> executeTransfer(@Valid @RequestBody TransferRequest request) {
        accountService.transferFunds(request.getSourceAccountId(), request.getTargetAccountId(), request.getAmount());
        return ResponseEntity.ok().build();
    }
}`
      },
      {
        path: 'README.md',
        category: 'DOCS',
        content: `# Enterprise Core Banking API
Spring Boot 3 REST microservice implementing strict transaction management, Spring Security JWT filters, and Flyway database migrations.`
      }
    ]
  }
];

/**
 * Loads a preset sample repository into IngestedRepository format
 */
export function loadSampleRepository(sampleId: string): IngestedRepository {
  const sample = SAMPLE_REPOSITORIES.find((s) => s.id === sampleId) || SAMPLE_REPOSITORIES[0];

  const analyzedFiles: FetchedFile[] = sample.sampleFiles.map((f) => ({
    path: f.path,
    category: f.category,
    content: f.content,
    sizeBytes: f.content.length,
  }));

  const categoryCounts: Record<string, number> = {};
  analyzedFiles.forEach((f) => {
    categoryCounts[f.category] = (categoryCounts[f.category] || 0) + 1;
  });

  return {
    id: sample.id,
    name: sample.name,
    owner: sample.owner,
    url: sample.url,
    metadata: {
      name: sample.name,
      fullName: `${sample.owner}/${sample.name}`,
      owner: sample.owner,
      description: sample.description,
      stars: sample.stars,
      forks: 48,
      openIssues: 3,
      defaultBranch: 'main',
      primaryLanguage: sample.primaryLanguage,
      topics: ['enterprise', 'microservices', 'rest-api', 'architecture'],
      updatedAt: new Date().toISOString(),
      sizeKb: 1420,
    },
    commits: [
      {
        sha: 'a8f192b',
        message: 'refactor(auth): switch to stateless token validation with refresh rotation',
        author: 'Lead Architect',
        date: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        sha: 'c3e901d',
        message: 'feat(database): add compound indexes on high-frequency query endpoints',
        author: 'DBA Team',
        date: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
      {
        sha: 'e5b228f',
        message: 'fix(concurrency): implement distributed locks to prevent double-spend race condition',
        author: 'Backend Senior',
        date: new Date(Date.now() - 86400000 * 10).toISOString(),
      },
    ],
    allFilePaths: analyzedFiles.map((f) => f.path),
    analyzedFiles,
    summary: {
      totalFiles: analyzedFiles.length + 15,
      analyzedCount: analyzedFiles.length,
      categories: categoryCounts,
    },
    fetchedAt: new Date().toISOString(),
  };
}
