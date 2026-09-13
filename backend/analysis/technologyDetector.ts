/**
 * Technology Detection Engine
 * Multi-language, multi-framework, cloud, database, auth and build tool detector.
 * Supports a wide spectrum of tech stacks without assuming MERN.
 */

import { IngestedRepository, FetchedFile } from '../github/repositoryFetcher';

export interface DetectedTechnologyStack {
  languages: string[];
  frontendFrameworks: string[];
  backendFrameworks: string[];
  databases: string[];
  ormOrQueryBuilders: string[];
  authentication: string[];
  apiTechnologies: string[];
  stateManagement: string[];
  cloudAndDevOps: string[];
  testingFrameworks: string[];
  buildToolsAndPackageManagers: string[];
  primaryStackLabel: string; // e.g. "Next.js + MongoDB Full-Stack", "FastAPI + PostgreSQL Backend", "Spring Boot Microservice"
}

export function detectTechnologies(repo: IngestedRepository): DetectedTechnologyStack {
  const allPaths = repo.allFilePaths.map((p) => p.toLowerCase());
  const allContents = repo.analyzedFiles.map((f) => f.content).join('\n');
  const lowerContents = allContents.toLowerCase();

  const manifestFiles = repo.analyzedFiles.filter((f) => f.category === 'MANIFEST');
  const manifestText = manifestFiles.map((m) => m.content.toLowerCase()).join('\n');

  const languages = new Set<string>();
  const frontend = new Set<string>();
  const backend = new Set<string>();
  const databases = new Set<string>();
  const orm = new Set<string>();
  const auth = new Set<string>();
  const apis = new Set<string>();
  const state = new Set<string>();
  const devops = new Set<string>();
  const testing = new Set<string>();
  const buildTools = new Set<string>();

  // 1. Language Detection by file extensions
  if (allPaths.some((p) => p.endsWith('.ts') || p.endsWith('.tsx'))) languages.add('TypeScript');
  if (allPaths.some((p) => p.endsWith('.js') || p.endsWith('.jsx') || p.endsWith('.mjs'))) languages.add('JavaScript');
  if (allPaths.some((p) => p.endsWith('.py'))) languages.add('Python');
  if (allPaths.some((p) => p.endsWith('.java'))) languages.add('Java');
  if (allPaths.some((p) => p.endsWith('.go'))) languages.add('Go');
  if (allPaths.some((p) => p.endsWith('.rs'))) languages.add('Rust');
  if (allPaths.some((p) => p.endsWith('.cs'))) languages.add('C#');
  if (allPaths.some((p) => p.endsWith('.php'))) languages.add('PHP');
  if (allPaths.some((p) => p.endsWith('.cpp') || p.endsWith('.cc') || p.endsWith('.cxx'))) languages.add('C++');
  if (allPaths.some((p) => p.endsWith('.dart'))) languages.add('Dart');
  if (allPaths.some((p) => p.endsWith('.rb'))) languages.add('Ruby');
  if (allPaths.some((p) => p.endsWith('.kt') || p.endsWith('.kts'))) languages.add('Kotlin');

  if (languages.size === 0 && repo.metadata.primaryLanguage) {
    languages.add(repo.metadata.primaryLanguage);
  }

  // 2. Frontend Frameworks
  if (manifestText.includes('"next"') || manifestText.includes("'next'") || allPaths.some((p) => p.includes('next.config'))) {
    frontend.add('Next.js');
    frontend.add('React');
  } else if (manifestText.includes('"react"') || manifestText.includes("'react'") || lowerContents.includes('from "react"') || lowerContents.includes("from 'react'")) {
    frontend.add('React');
  }
  if (manifestText.includes('"vue"') || manifestText.includes("'vue'") || allPaths.some((p) => p.endsWith('.vue'))) frontend.add('Vue.js');
  if (manifestText.includes('@angular/core') || allPaths.some((p) => p.includes('angular.json'))) frontend.add('Angular');
  if (manifestText.includes('svelte') || allPaths.some((p) => p.endsWith('.svelte'))) frontend.add('Svelte');
  if (allPaths.some((p) => p.endsWith('pubspec.yaml')) && lowerContents.includes('flutter')) frontend.add('Flutter');
  if (manifestText.includes('react-native')) frontend.add('React Native');
  if (manifestText.includes('tailwindcss') || allPaths.some((p) => p.includes('tailwind'))) frontend.add('Tailwind CSS');

  // 3. Backend Frameworks
  if (manifestText.includes('"express"') || manifestText.includes("'express'") || lowerContents.includes("require('express')") || lowerContents.includes('from "express"')) {
    backend.add('Express.js');
    backend.add('Node.js');
  }
  if (manifestText.includes('@nestjs/core')) {
    backend.add('NestJS');
    backend.add('Node.js');
  }
  if (manifestText.includes('fastapi') || lowerContents.includes('from fastapi import') || lowerContents.includes('import fastapi')) backend.add('FastAPI');
  if (manifestText.includes('django') || lowerContents.includes('from django.') || allPaths.some((p) => p.endsWith('manage.py'))) backend.add('Django');
  if (manifestText.includes('flask') || lowerContents.includes('from flask import') || lowerContents.includes('import flask')) backend.add('Flask');
  if (manifestText.includes('spring-boot') || lowerContents.includes('@springbootapplication') || lowerContents.includes('org.springframework')) backend.add('Spring Boot');
  if (allPaths.some((p) => p.endsWith('.csproj')) || manifestText.includes('microsoft.aspnetcore')) backend.add('ASP.NET Core');
  if (manifestText.includes('laravel') || allPaths.some((p) => p.includes('artisan'))) backend.add('Laravel');
  if (manifestText.includes('gin-gonic') || lowerContents.includes('github.com/gin-gonic/gin')) backend.add('Gin');
  if (manifestText.includes('actix-web')) backend.add('Actix-Web');

  if (backend.size === 0 && (languages.has('JavaScript') || languages.has('TypeScript')) && manifestFiles.length > 0) {
    if (!frontend.has('React') && !frontend.has('Vue.js') && !frontend.has('Angular')) {
      backend.add('Node.js');
    }
  }

  // 4. Databases & ORMs
  if (manifestText.includes('mongoose') || manifestText.includes('mongodb') || lowerContents.includes('mongodb://') || lowerContents.includes('mongodb+srv://')) {
    databases.add('MongoDB');
    if (manifestText.includes('mongoose')) orm.add('Mongoose');
  }
  if (manifestText.includes('pg') || manifestText.includes('postgres') || manifestText.includes('psycopg') || manifestText.includes('asyncpg')) {
    databases.add('PostgreSQL');
  }
  if (manifestText.includes('mysql') || manifestText.includes('mysql2') || manifestText.includes('pymysql')) {
    databases.add('MySQL');
  }
  if (manifestText.includes('sqlite') || manifestText.includes('sqlite3') || manifestText.includes('aiosqlite')) {
    databases.add('SQLite');
  }
  if (manifestText.includes('redis') || manifestText.includes('ioredis') || lowerContents.includes('redis://')) {
    databases.add('Redis');
  }
  if (manifestText.includes('firebase') || manifestText.includes('@firebase/firestore')) {
    databases.add('Firebase / Firestore');
  }
  if (manifestText.includes('@supabase/supabase-js')) {
    databases.add('Supabase (PostgreSQL)');
  }

  // ORMs
  if (manifestText.includes('@prisma/client') || allPaths.some((p) => p.includes('schema.prisma'))) orm.add('Prisma ORM');
  if (manifestText.includes('sqlalchemy') || lowerContents.includes('from sqlalchemy')) orm.add('SQLAlchemy');
  if (manifestText.includes('hibernate') || lowerContents.includes('org.hibernate')) orm.add('Hibernate JPA');
  if (manifestText.includes('drizzle-orm')) orm.add('Drizzle ORM');
  if (manifestText.includes('typeorm')) orm.add('TypeORM');
  if (manifestText.includes('alembic')) orm.add('Alembic Migrations');

  // 5. Authentication
  if (manifestText.includes('jsonwebtoken') || manifestText.includes('jose') || lowerContents.includes('jwt.') || lowerContents.includes('jwt_required')) {
    auth.add('JWT (JSON Web Tokens)');
  }
  if (manifestText.includes('passport')) auth.add('Passport.js');
  if (manifestText.includes('next-auth') || manifestText.includes('@auth/core')) auth.add('NextAuth.js');
  if (manifestText.includes('better-auth')) auth.add('Better-Auth');
  if (manifestText.includes('spring-security') || lowerContents.includes('@enablewebsecurity')) auth.add('Spring Security');
  if (manifestText.includes('bcrypt') || manifestText.includes('argon2') || manifestText.includes('passlib')) auth.add('Password Hashing (Bcrypt/Argon2)');
  if (manifestText.includes('oauth') || lowerContents.includes('oauth2')) auth.add('OAuth 2.0');

  // 6. API Technologies
  if (manifestText.includes('graphql') || manifestText.includes('@apollo/client') || manifestText.includes('apollo-server')) {
    apis.add('GraphQL');
  }
  if (manifestText.includes('@trpc/server') || manifestText.includes('@trpc/client')) {
    apis.add('tRPC');
  }
  if (manifestText.includes('socket.io') || manifestText.includes('ws') || lowerContents.includes('websocket')) {
    apis.add('WebSockets');
  }
  if (backend.size > 0 || allPaths.some((p) => p.includes('api') || p.includes('route'))) {
    apis.add('REST API');
  }

  // 7. State Management
  if (manifestText.includes('zustand')) state.add('Zustand');
  if (manifestText.includes('@reduxjs/toolkit') || manifestText.includes('redux')) state.add('Redux / RTK');
  if (manifestText.includes('pinia')) state.add('Pinia');
  if (manifestText.includes('mobx')) state.add('MobX');
  if (manifestText.includes('bloc') || manifestText.includes('flutter_bloc')) state.add('BLoC');
  if (manifestText.includes('provider')) state.add('Provider');

  // 8. Cloud & DevOps
  if (allPaths.some((p) => p.includes('dockerfile') || p.includes('docker-compose'))) devops.add('Docker');
  if (allPaths.some((p) => p.includes('k8s') || p.includes('kubernetes') || p.endsWith('.yaml') && lowerContents.includes('apiversion: apps/v1'))) devops.add('Kubernetes');
  if (allPaths.some((p) => p.includes('.github/workflows'))) devops.add('GitHub Actions CI/CD');
  if (manifestText.includes('aws-sdk') || manifestText.includes('@aws-sdk')) devops.add('AWS SDK');
  if (allPaths.some((p) => p.includes('vercel.json'))) devops.add('Vercel');

  // 9. Testing
  if (manifestText.includes('jest')) testing.add('Jest');
  if (manifestText.includes('vitest')) testing.add('Vitest');
  if (manifestText.includes('pytest')) testing.add('Pytest');
  if (manifestText.includes('cypress')) testing.add('Cypress');
  if (manifestText.includes('playwright') || manifestText.includes('@playwright/test')) testing.add('Playwright');
  if (manifestText.includes('junit')) testing.add('JUnit');

  // 10. Build Tools & Package Managers
  if (allPaths.some((p) => p.endsWith('pom.xml'))) buildTools.add('Maven');
  if (allPaths.some((p) => p.endsWith('build.gradle') || p.endsWith('build.gradle.kts'))) buildTools.add('Gradle');
  if (allPaths.some((p) => p.endsWith('cargo.toml'))) buildTools.add('Cargo');
  if (allPaths.some((p) => p.endsWith('go.mod'))) buildTools.add('Go Modules');
  if (allPaths.some((p) => p.endsWith('vite.config.ts') || p.endsWith('vite.config.js'))) buildTools.add('Vite');
  if (manifestText.includes('turbopack') || manifestText.includes('turbo')) buildTools.add('Turborepo');
  if (allPaths.some((p) => p.endsWith('package.json'))) buildTools.add('npm / Node');

  // Determine Primary Stack Label
  const feName = Array.from(frontend)[0] || '';
  const beName = Array.from(backend)[0] || '';
  const dbName = Array.from(databases)[0] || '';

  let primaryStackLabel = 'Custom Software Architecture';
  if (feName && beName && dbName) {
    primaryStackLabel = `${feName} + ${beName} + ${dbName} Full-Stack`;
  } else if (feName && beName) {
    primaryStackLabel = `${feName} + ${beName} Full-Stack`;
  } else if (beName && dbName) {
    primaryStackLabel = `${beName} with ${dbName} Backend`;
  } else if (beName) {
    primaryStackLabel = `${beName} Backend Service`;
  } else if (feName) {
    primaryStackLabel = `${feName} Client Application`;
  } else if (languages.size > 0) {
    primaryStackLabel = `${Array.from(languages).join('/')} Application`;
  }

  return {
    languages: Array.from(languages),
    frontendFrameworks: Array.from(frontend),
    backendFrameworks: Array.from(backend),
    databases: Array.from(databases),
    ormOrQueryBuilders: Array.from(orm),
    authentication: Array.from(auth),
    apiTechnologies: Array.from(apis),
    stateManagement: Array.from(state),
    cloudAndDevOps: Array.from(devops),
    testingFrameworks: Array.from(testing),
    buildToolsAndPackageManagers: Array.from(buildTools),
    primaryStackLabel,
  };
}
