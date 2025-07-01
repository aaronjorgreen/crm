# 🎯 Token Optimization Strategy Guide

## 📋 **How to Use This Guide**

### **Simple Instructions for Me:**
Just tell me: **"Focus on [FEATURE_NAME]"** and I'll automatically:
1. ✅ Only consider relevant files
2. ✅ Ignore everything else  
3. ✅ Optimize token usage
4. ✅ Give focused responses

**No manual work needed - just specify the feature!**

---

## 🗂️ **Complete Feature Focus Map**

### **🔐 USER MANAGEMENT**
```
INCLUDE ONLY:
├── src/components/users/
│   ├── UserManagement.tsx
│   ├── UserList.tsx
│   ├── UserForm.tsx
│   ├── UserInvitationModal.tsx
│   ├── UserPermissionsModal.tsx
│   ├── PendingInvitations.tsx
│   └── UserAnalytics.tsx
├── src/lib/users.ts
├── src/types/user.ts
├── src/pages/UsersPage.tsx
├── src/hooks/useUsers.ts
└── src/components/demo/PermissionGate.tsx (for permissions)

IGNORE EVERYTHING ELSE:
❌ All client-related files
❌ All project-related files  
❌ All AI-related files
❌ Analytics (except UserAnalytics)
❌ Email components
```

### **👥 CLIENT MANAGEMENT**
```
INCLUDE ONLY:
├── src/components/clients/
│   └── ClientList.tsx
├── src/lib/clients.ts
├── src/types/project.ts (Client types only)
├── src/pages/ClientsPage.tsx
└── src/components/demo/PermissionGate.tsx

IGNORE EVERYTHING ELSE:
❌ All user management files
❌ All project management files
❌ All AI-related files
❌ Analytics components
❌ Email components
```

### **📋 PROJECT MANAGEMENT**
```
INCLUDE ONLY:
├── src/components/projects/
│   ├── ProjectList.tsx
│   └── ProjectKanban.tsx
├── src/lib/projects.ts
├── src/types/project.ts (Project & Task types)
├── src/pages/ProjectsPage.tsx
├── src/hooks/useProjects.ts (if exists)
└── src/components/demo/PermissionGate.tsx

IGNORE EVERYTHING ELSE:
❌ User management (except basic auth)
❌ Client management (except basic client data)
❌ AI components
❌ Analytics
❌ Email components
```

### **🏠 DASHBOARD & OVERVIEW**
```
INCLUDE ONLY:
├── src/components/dashboard/
│   ├── DashboardOverview.tsx
│   └── GreetingPanel.tsx
├── src/pages/DashboardPage.tsx
├── src/components/layout/MainLayout.tsx
├── src/components/layout/Sidebar.tsx
└── src/hooks/useDemoAuth.ts

IGNORE EVERYTHING ELSE:
❌ Detailed management components
❌ AI features
❌ Analytics details
❌ Email system
```

### **🤖 AI INTEGRATION**
```
INCLUDE ONLY:
├── src/components/ai/
│   └── AIExtractionPanel.tsx
├── src/lib/ai.ts
├── src/types/ai.ts (if exists)
└── Related extraction types in project.ts

IGNORE EVERYTHING ELSE:
❌ User management details
❌ Client management details
❌ Project management details
❌ Dashboard components
```

### **📧 EMAIL SYSTEM**
```
INCLUDE ONLY:
├── src/components/admin/
│   └── EmailTestPanel.tsx
├── src/lib/email.ts
├── src/lib/emailSetup.ts
├── src/pages/EmailSetupPage.tsx
└── supabase/functions/send-email/

IGNORE EVERYTHING ELSE:
❌ All management components
❌ AI features
❌ Dashboard details
❌ Analytics
```

### **📊 ANALYTICS & REPORTING**
```
INCLUDE ONLY:
├── src/components/analytics/
│   └── SuperAdminDashboard.tsx
├── Analytics parts of:
│   ├── src/lib/users.ts (analytics functions)
│   ├── src/lib/clients.ts (stats functions)
│   └── src/lib/projects.ts (stats functions)
└── src/types/user.ts (AnalyticsData type)

IGNORE EVERYTHING ELSE:
❌ CRUD operations
❌ Form components
❌ Basic management features
```

### **🔧 CORE INFRASTRUCTURE**
```
INCLUDE ONLY:
├── src/lib/supabase.ts
├── src/hooks/useDemoAuth.ts
├── src/components/demo/
├── src/components/layout/
├── src/components/ui/
├── src/types/auth.ts
└── Database migrations

IGNORE EVERYTHING ELSE:
❌ Feature-specific components
❌ Business logic
❌ Page components
```

---

## 🎯 **Usage Examples**

### **Example 1: Working on User Management**
**You say:** *"Focus on User Management - I want to improve the user invitation flow"*

**I'll automatically consider only:**
- UserInvitationModal.tsx
- UserManagement.tsx  
- PendingInvitations.tsx
- users.ts service
- user.ts types
- UsersPage.tsx

**I'll ignore:** All client, project, AI, email, and analytics code

### **Example 2: Working on Project Kanban**
**You say:** *"Focus on Project Management - fix the drag and drop in kanban"*

**I'll automatically consider only:**
- ProjectKanban.tsx
- ProjectList.tsx
- projects.ts service
- project.ts types
- ProjectsPage.tsx

**I'll ignore:** Everything else

### **Example 3: Cross-Feature Work**
**You say:** *"Focus on Dashboard + User Management - show user stats on dashboard"*

**I'll consider:**
- Dashboard components
- User analytics components
- Relevant service functions
- Required types

---

## 🚀 **Advanced Focus Strategies**

### **🔍 MICRO-FOCUS (Single Component)**
**You say:** *"Focus only on UserInvitationModal - add role selection"*
- I'll only look at that one component + its immediate dependencies

### **🔄 INTEGRATION FOCUS (Two Features)**
**You say:** *"Focus on Client + Project integration - link clients to projects"*
- I'll consider both client and project files
- Focus on relationship/integration code

### **🛠️ INFRASTRUCTURE FOCUS**
**You say:** *"Focus on Core Infrastructure - improve error handling"*
- I'll look at base services, hooks, and utilities
- Ignore feature-specific implementations

---

## 📈 **Token Savings Estimate**

| Focus Type | Files Included | Token Reduction |
|------------|----------------|-----------------|
| Single Feature | ~8-12 files | **~75% savings** |
| Micro-Focus | ~2-4 files | **~90% savings** |
| Integration | ~15-20 files | **~60% savings** |
| Infrastructure | ~10-15 files | **~70% savings** |

---

## 🎯 **Quick Reference Commands**

```bash
# Feature Focus
"Focus on User Management"
"Focus on Client Management" 
"Focus on Project Management"
"Focus on Dashboard"
"Focus on AI Integration"
"Focus on Email System"
"Focus on Analytics"

# Micro Focus
"Focus only on [ComponentName]"
"Focus on [FeatureName] + [FeatureName]"

# Infrastructure Focus  
"Focus on Core Infrastructure"
"Focus on Database Schema"
"Focus on Authentication"
```

---

## ✅ **Best Practices**

1. **Always specify focus** at the start of your message
2. **Be specific** about what you want to work on
3. **Mention cross-dependencies** if working across features
4. **Use micro-focus** for small changes
5. **Use integration focus** for connecting features

**Remember: Just tell me what to focus on - I'll handle the rest automatically!** 🎯