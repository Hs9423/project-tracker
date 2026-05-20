import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const HASH_ROUNDS = 12;

  // ── Super Admin ──────────────────────────────────────────────────────────────
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@company.com',
      passwordHash: await bcrypt.hash('Admin@123', HASH_ROUNDS),
      role: Role.super_admin,
      path: '',
      depth: 0,
    },
  });
  console.log('  ✓ Super Admin:', superAdmin.email);

  // ── Team Head (root of org tree) ────────────────────────────────────────────
  const teamHead = await prisma.user.upsert({
    where: { email: 'teamhead@company.com' },
    update: {},
    create: {
      name: 'Alex Team Head',
      email: 'teamhead@company.com',
      passwordHash: await bcrypt.hash('Password@123', HASH_ROUNDS),
      role: Role.user,
      depth: 0,
      path: '',
    },
  });
  // Path = own id (root node)
  await prisma.user.update({
    where: { id: teamHead.id },
    data: { path: teamHead.id },
  });
  console.log('  ✓ Team Head:', teamHead.email);

  // ── Manager 1 ────────────────────────────────────────────────────────────────
  const manager1 = await prisma.user.upsert({
    where: { email: 'manager1@company.com' },
    update: {},
    create: {
      name: 'Jordan Manager 1',
      email: 'manager1@company.com',
      passwordHash: await bcrypt.hash('Password@123', HASH_ROUNDS),
      role: Role.user,
      reportsTo: teamHead.id,
      depth: 1,
      path: '',
    },
  });
  await prisma.user.update({
    where: { id: manager1.id },
    data: { path: `${teamHead.id}.${manager1.id}` },
  });
  console.log('  ✓ Manager 1:', manager1.email);

  // ── Manager 2 ────────────────────────────────────────────────────────────────
  const manager2 = await prisma.user.upsert({
    where: { email: 'manager2@company.com' },
    update: {},
    create: {
      name: 'Sam Manager 2',
      email: 'manager2@company.com',
      passwordHash: await bcrypt.hash('Password@123', HASH_ROUNDS),
      role: Role.user,
      reportsTo: teamHead.id,
      depth: 1,
      path: '',
    },
  });
  await prisma.user.update({
    where: { id: manager2.id },
    data: { path: `${teamHead.id}.${manager2.id}` },
  });
  console.log('  ✓ Manager 2:', manager2.email);

  // ── Employees under Manager 1 ────────────────────────────────────────────────
  const employee1 = await prisma.user.upsert({
    where: { email: 'employee1@company.com' },
    update: {},
    create: {
      name: 'Riley Employee 1',
      email: 'employee1@company.com',
      passwordHash: await bcrypt.hash('Password@123', HASH_ROUNDS),
      role: Role.user,
      reportsTo: manager1.id,
      depth: 2,
      path: '',
    },
  });
  await prisma.user.update({
    where: { id: employee1.id },
    data: { path: `${teamHead.id}.${manager1.id}.${employee1.id}` },
  });

  const employee2 = await prisma.user.upsert({
    where: { email: 'employee2@company.com' },
    update: {},
    create: {
      name: 'Casey Employee 2',
      email: 'employee2@company.com',
      passwordHash: await bcrypt.hash('Password@123', HASH_ROUNDS),
      role: Role.user,
      reportsTo: manager1.id,
      depth: 2,
      path: '',
    },
  });
  await prisma.user.update({
    where: { id: employee2.id },
    data: { path: `${teamHead.id}.${manager1.id}.${employee2.id}` },
  });
  console.log('  ✓ Employees under Manager 1:', employee1.email, employee2.email);

  // ── Employees under Manager 2 ────────────────────────────────────────────────
  const employee3 = await prisma.user.upsert({
    where: { email: 'employee3@company.com' },
    update: {},
    create: {
      name: 'Morgan Employee 3',
      email: 'employee3@company.com',
      passwordHash: await bcrypt.hash('Password@123', HASH_ROUNDS),
      role: Role.user,
      reportsTo: manager2.id,
      depth: 2,
      path: '',
    },
  });
  await prisma.user.update({
    where: { id: employee3.id },
    data: { path: `${teamHead.id}.${manager2.id}.${employee3.id}` },
  });

  const employee4 = await prisma.user.upsert({
    where: { email: 'employee4@company.com' },
    update: {},
    create: {
      name: 'Drew Employee 4',
      email: 'employee4@company.com',
      passwordHash: await bcrypt.hash('Password@123', HASH_ROUNDS),
      role: Role.user,
      reportsTo: manager2.id,
      depth: 2,
      path: '',
    },
  });
  await prisma.user.update({
    where: { id: employee4.id },
    data: { path: `${teamHead.id}.${manager2.id}.${employee4.id}` },
  });
  console.log('  ✓ Employees under Manager 2:', employee3.email, employee4.email);

  // ── Sample Project ───────────────────────────────────────────────────────────
  const project = await prisma.project.create({
    data: {
      title: 'Website Redesign Q1',
      description: 'Complete overhaul of the company website for Q1 launch.',
      createdBy: teamHead.id,
      status: 'active',
      priority: 'high',
      tags: ['design', 'frontend', 'q1'],
    },
  });
  console.log('  ✓ Sample project:', project.title);

  // ── Project Assignment: Team Head assigns to Employee 1 ─────────────────────
  await prisma.projectAssignment.create({
    data: {
      projectId: project.id,
      assignedTo: employee1.id,
      assignedBy: teamHead.id,
    },
  });

  // ── Visibility computation ───────────────────────────────────────────────────
  // Employee 1 → assignee
  await prisma.projectVisibility.upsert({
    where: { projectId_userId: { projectId: project.id, userId: employee1.id } },
    update: {},
    create: { projectId: project.id, userId: employee1.id, reason: 'assignee' },
  });

  // Manager 1 → ancestor of Employee 1
  await prisma.projectVisibility.upsert({
    where: { projectId_userId: { projectId: project.id, userId: manager1.id } },
    update: {},
    create: { projectId: project.id, userId: manager1.id, reason: 'ancestor' },
  });

  // Team Head → ancestor of Employee 1 (and also the assigner)
  await prisma.projectVisibility.upsert({
    where: { projectId_userId: { projectId: project.id, userId: teamHead.id } },
    update: {},
    create: { projectId: project.id, userId: teamHead.id, reason: 'ancestor' },
  });

  console.log('  ✓ Visibility computed for sample project');

  // ── Sample Task ──────────────────────────────────────────────────────────────
  const task = await prisma.task.create({
    data: {
      projectId: project.id,
      title: 'Design new homepage layout',
      description: 'Create wireframes and mockups for the new homepage.',
      assigneeId: employee1.id,
      createdBy: teamHead.id,
      status: 'in_progress',
      priority: 'high',
      estimatedHours: 16,
      position: 0,
      path: '',
    },
  });
  await prisma.task.update({
    where: { id: task.id },
    data: { path: task.id },
  });
  console.log('  ✓ Sample task:', task.title);

  console.log('\nSeed complete.\n');
  console.log('Login credentials:');
  console.log('  Super Admin  → admin@company.com     / Admin@123');
  console.log('  Team Head    → teamhead@company.com  / Password@123');
  console.log('  Manager 1    → manager1@company.com  / Password@123');
  console.log('  Employee 1   → employee1@company.com / Password@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
