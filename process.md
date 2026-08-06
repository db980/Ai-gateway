Project Overview

You are a Senior Software Architect and Full Stack Engineer.

Build a production-ready AI Gateway Platform similar to OpenRouter/OpenWebUI using:

Frontend: React 19 + TypeScript + Vite
Backend: ASP.NET Core 9 Web API
Database: SQL Server
ORM: Entity Framework Core
Authentication: JWT + Refresh Token
Cache: Redis
Logging: Serilog
Documentation: Swagger/OpenAPI
Queue: Hangfire (optional)
Docker Support
Clean Architecture
Repository Pattern
Unit of Work
CQRS (optional)

The application should allow users to connect multiple AI providers and expose a single unified API endpoint.

Goal

Instead of integrating many AI providers separately,

the client calls

POST /api/chat

and backend automatically routes requests to selected model/provider.

Example

Client

↓

My AI Gateway

↓

OpenAI
Claude
Gemini
DeepSeek
Ollama
Azure OpenAI
OpenRouter
Groq
Mistral
Custom APIs
Phase 1
Authentication

Implement

Login
Register
Forgot Password
Reset Password
Refresh Token
JWT
User Roles

Roles

Super Admin
Admin
User

Permissions

View Models
Create Models
Delete Models
Generate API Keys
View Usage
Billing
Analytics
Phase 2
Dashboard

Create React Admin Dashboard

Cards

Total Users
Active Models
Total Requests
Today's Requests
Tokens Used
Revenue
Errors
Active API Keys

Charts

Request Count
Token Usage
Cost
Provider Usage
Daily Requests

Recent Activity

Latest Requests

Recent Errors

Phase 3
AI Providers

Allow unlimited providers.

Fields

Provider Name

Provider Type

Base URL

API Key

Organization

Model List

Status

Priority

Rate Limit

Timeout

Headers

Active

Supported providers

OpenAI
Azure OpenAI
Claude
Gemini
DeepSeek
Groq
Mistral
OpenRouter
Ollama
LM Studio
Custom REST API
Phase 4
AI Models

Support unlimited models.

Example

GPT-4

GPT-4.1

GPT-5

Claude Sonnet

Claude Opus

Gemini Pro

Gemini Flash

DeepSeek Chat

DeepSeek Reasoner

Llama 3

Qwen

Mixtral

Phi

Local Models

Fields

Name

Display Name

Provider

Context Window

Max Tokens

Supports Images

Supports Vision

Supports Audio

Supports Function Calling

Supports Streaming

Status
Phase 5
Unified Chat Endpoint

Single endpoint

POST /api/chat

Request

{
  "model":"gpt-5",
  "messages":[
      {
        "role":"user",
        "content":"Hello"
      }
  ]
}

Backend automatically

validates API key
validates user
checks quota
routes request
calls provider
logs usage
returns response
Phase 6
Streaming

Support

Server Sent Events

Streaming

Realtime Response

Phase 7
API Keys

Users can generate multiple keys.

Example

sk_live_xxxxxxxxx

sk_test_xxxxxxxxx

Permissions

Read

Write

Admin

Expiration

IP Whitelist

Rate Limit

Quota

Status

Phase 8
Usage Tracking

Track

Prompt Tokens

Completion Tokens

Total Tokens

Provider Cost

User Cost

Latency

Errors

IP Address

Request Size

Response Size

Store every request.

Phase 9
Prompt Templates

Allow saving prompts.

Example

Code Review

Summarize

Translate

SQL Generator

Email Writer

Bug Fix

Architecture Review

Categories

Tags

Favorites

Public

Private

Phase 10
Playground

React page

Left

Prompt

Middle

Settings

Right

Response

Settings

Temperature

Top P

Frequency Penalty

Presence Penalty

Max Tokens

Stop Sequence

Streaming

JSON Mode

Phase 11
Billing

Plans

Free

Starter

Professional

Enterprise

Track

Credits

Balance

Invoices

Payments

Stripe Integration Ready

Phase 12
Analytics

Charts

Provider Usage

Model Usage

Hourly Requests

Daily Requests

Top Users

Top Models

Average Response Time

Token Consumption

Phase 13
Rate Limiting

Per User

Per API Key

Per Provider

Per IP

Configurable

Phase 14
Admin Panel

Manage

Users

Roles

Permissions

Providers

Models

API Keys

Logs

Billing

Analytics

Prompt Templates

Settings

Phase 15
Settings

SMTP

JWT

Redis

SQL

Storage

Theme

Branding

Default Model

System Prompt

Phase 16
Logs

Log

Request

Response

Errors

Exceptions

Performance

Audit Trail

Phase 17
React UI

Pages

Login

Dashboard

Providers

Models

API Keys

Usage

Analytics

Billing

Prompt Templates

Playground

Users

Roles

Settings

Logs

Use

Material UI

or

Shadcn UI

Dark Mode

Light Mode

Responsive

Phase 18
Backend Structure
src

API

Application

Domain

Infrastructure

Persistence

Shared

Common

Use

Clean Architecture
Dependency Injection
Repository Pattern
Unit of Work
FluentValidation
MediatR
AutoMapper
Phase 19
React Structure
src

api

components

layouts

pages

hooks

store

services

utils

types

context

routes

assets

theme

Use

React Query
Zustand
Axios
React Router
TypeScript
TanStack Table
React Hook Form
Zod
Recharts
Phase 20
Security

Encrypt API Keys

HTTPS

JWT

Refresh Tokens

Password Hash

Role Permission

CORS

Rate Limit

Audit Logs

Phase 21
External API Support

Allow users to register any external AI API.

Fields

Name

Endpoint

Headers

Authentication Type

Bearer

API Key

Basic

OAuth

Body Template

Response Template

Error Template

Allow response mapping.

Phase 22
Custom Model Mapping

Example

Model

"My GPT"

↓

Provider

OpenAI

↓

Actual Model

gpt-5

or

Office AI

↓

Claude Sonnet

↓

anthropic

Users always use

Office AI

instead of actual provider model.

Phase 23
API Documentation

Swagger

OpenAPI

Postman Collection

Sample Requests

Sample Responses

Phase 24
Docker

Create

Dockerfile

docker-compose

SQL Server

Redis

API

React

Nginx