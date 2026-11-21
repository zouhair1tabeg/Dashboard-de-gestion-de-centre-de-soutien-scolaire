import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL est introuvable dans l'environnement.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const adminEmail = process.env.ADMIN_EMAIL ?? "admin@centre-prime.ma";
const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin@12345";

const subjects = [
  { id: "subj-maths", name: "Mathématiques", type: "SCHOOL" as const },
  { id: "subj-pc", name: "Physique-Chimie", type: "SCHOOL" as const },
  { id: "subj-fr", name: "Français", type: "LANGUAGE" as const },
  { id: "subj-en", name: "Anglais", type: "LANGUAGE" as const },
];

const levels = [
  { id: "lvl-maths-2bac", name: "2ème Bac Sciences", subjectId: "subj-maths" },
  { id: "lvl-maths-1bac", name: "1ère Bac Sciences", subjectId: "subj-maths" },
  { id: "lvl-pc-2bac", name: "2ème Bac Sciences", subjectId: "subj-pc" },
  { id: "lvl-pc-1bac", name: "1ère Bac Sciences", subjectId: "subj-pc" },
  { id: "lvl-fr-b2", name: "B2", subjectId: "subj-fr" },
  { id: "lvl-fr-b1", name: "B1", subjectId: "subj-fr" },
  { id: "lvl-en-b1", name: "B1", subjectId: "subj-en" },
  { id: "lvl-en-a2", name: "A2", subjectId: "subj-en" },
];

const groups = [
  {
    id: "grp-maths-2bac-a",
    name: "Groupe A",
    levelId: "lvl-maths-2bac",
    monthlyFee: "350.00",
    capacity: 20,
  },
  {
    id: "grp-maths-2bac-b",
    name: "Groupe B",
    levelId: "lvl-maths-2bac",
    monthlyFee: "350.00",
    capacity: 20,
  },
  {
    id: "grp-maths-1bac-a",
    name: "Groupe A",
    levelId: "lvl-maths-1bac",
    monthlyFee: "300.00",
    capacity: 18,
  },
  {
    id: "grp-pc-2bac-a",
    name: "Groupe A",
    levelId: "lvl-pc-2bac",
    monthlyFee: "300.00",
    capacity: 18,
  },
  {
    id: "grp-pc-1bac-a",
    name: "Groupe A",
    levelId: "lvl-pc-1bac",
    monthlyFee: "280.00",
    capacity: 16,
  },
  {
    id: "grp-fr-b2-a",
    name: "Groupe A",
    levelId: "lvl-fr-b2",
    monthlyFee: "250.00",
    capacity: 15,
  },
  {
    id: "grp-fr-b1-a",
    name: "Groupe A",
    levelId: "lvl-fr-b1",
    monthlyFee: "250.00",
    capacity: 15,
  },
  {
    id: "grp-en-a2-a",
    name: "Groupe A",
    levelId: "lvl-en-a2",
    monthlyFee: "220.00",
    capacity: 15,
  },
];

const schedules = [
  { groupId: "grp-maths-2bac-a", dayOfWeek: 6, startTime: "09:00", endTime: "11:00" },
  { groupId: "grp-maths-2bac-a", dayOfWeek: 3, startTime: "17:00", endTime: "19:00" },
  { groupId: "grp-maths-2bac-b", dayOfWeek: 0, startTime: "09:00", endTime: "11:00" },
  { groupId: "grp-maths-2bac-b", dayOfWeek: 2, startTime: "17:00", endTime: "19:00" },
  { groupId: "grp-maths-1bac-a", dayOfWeek: 6, startTime: "11:00", endTime: "13:00" },
  { groupId: "grp-maths-1bac-a", dayOfWeek: 4, startTime: "17:00", endTime: "19:00" },
  { groupId: "grp-pc-2bac-a", dayOfWeek: 0, startTime: "11:00", endTime: "13:00" },
  { groupId: "grp-pc-2bac-a", dayOfWeek: 1, startTime: "17:00", endTime: "19:00" },
  { groupId: "grp-pc-1bac-a", dayOfWeek: 6, startTime: "15:00", endTime: "17:00" },
  { groupId: "grp-fr-b2-a", dayOfWeek: 3, startTime: "15:00", endTime: "17:00" },
  { groupId: "grp-fr-b2-a", dayOfWeek: 6, startTime: "17:00", endTime: "19:00" },
  { groupId: "grp-fr-b1-a", dayOfWeek: 2, startTime: "15:00", endTime: "17:00" },
  { groupId: "grp-fr-b1-a", dayOfWeek: 0, startTime: "15:00", endTime: "17:00" },
  { groupId: "grp-en-a2-a", dayOfWeek: 4, startTime: "15:00", endTime: "17:00" },
  { groupId: "grp-en-a2-a", dayOfWeek: 6, startTime: "13:00", endTime: "15:00" },
];

type SeedStudent = {
  id: string;
  fullName: string;
  phone: string;
  parentName: string;
  parentPhone: string;
  registeredAt: string;
};

const students: SeedStudent[] = [
  { id: "stu-001", fullName: "Youssef El Amrani", phone: "0612345601", parentName: "Rachid El Amrani", parentPhone: "0661223301", registeredAt: "2026-09-02" },
  { id: "stu-002", fullName: "Salma Benali", phone: "0612345602", parentName: "Nadia Benali", parentPhone: "0661223302", registeredAt: "2026-09-02" },
  { id: "stu-003", fullName: "Mohamed Ait Taleb", phone: "0612345603", parentName: "Hassan Ait Taleb", parentPhone: "0661223303", registeredAt: "2026-09-03" },
  { id: "stu-004", fullName: "Fatima Zahra Alaoui", phone: "0612345604", parentName: "Mustapha Alaoui", parentPhone: "0661223304", registeredAt: "2026-09-05" },
  { id: "stu-005", fullName: "Omar Bennani", phone: "0612345605", parentName: "Khalid Bennani", parentPhone: "0661223305", registeredAt: "2026-09-06" },
  { id: "stu-006", fullName: "Khadija El Fassi", phone: "0612345606", parentName: "Samira El Fassi", parentPhone: "0661223306", registeredAt: "2026-09-07" },
  { id: "stu-007", fullName: "Hamza Rachidi", phone: "0612345607", parentName: "Abdelilah Rachidi", parentPhone: "0661223307", registeredAt: "2026-09-08" },
  { id: "stu-008", fullName: "Nisrine Bouazza", phone: "0612345608", parentName: "Latifa Bouazza", parentPhone: "0661223308", registeredAt: "2026-09-09" },
  { id: "stu-009", fullName: "Anas El Idrissi", phone: "0612345609", parentName: "Jamal El Idrissi", parentPhone: "0661223309", registeredAt: "2026-09-10" },
  { id: "stu-010", fullName: "Imane Tahiri", phone: "0612345610", parentName: "Said Tahiri", parentPhone: "0661223310", registeredAt: "2026-09-11" },
  { id: "stu-011", fullName: "Mehdi Ouazzani", phone: "0612345611", parentName: "Leila Ouazzani", parentPhone: "0661223311", registeredAt: "2026-09-12" },
  { id: "stu-012", fullName: "Sara Lamrani", phone: "0612345612", parentName: "Hicham Lamrani", parentPhone: "0661223312", registeredAt: "2026-09-13" },
  { id: "stu-013", fullName: "Ayoub Chraibi", phone: "0612345613", parentName: "Fouad Chraibi", parentPhone: "0661223313", registeredAt: "2026-09-14" },
  { id: "stu-014", fullName: "Hajar Benjelloun", phone: "0612345614", parentName: "Karima Benjelloun", parentPhone: "0661223314", registeredAt: "2026-09-15" },
  { id: "stu-015", fullName: "Reda Mansouri", phone: "0612345615", parentName: "Abdelaziz Mansouri", parentPhone: "0661223315", registeredAt: "2026-09-16" },
  { id: "stu-016", fullName: "Soukaina El Khattabi", phone: "0612345616", parentName: "Houda El Khattabi", parentPhone: "0661223316", registeredAt: "2026-09-17" },
  { id: "stu-017", fullName: "Yassine Berrada", phone: "0612345617", parentName: "Mounir Berrada", parentPhone: "0661223317", registeredAt: "2026-09-18" },
  { id: "stu-018", fullName: "Meryem Sabri", phone: "0612345618", parentName: "Nabil Sabri", parentPhone: "0661223318", registeredAt: "2026-09-19" },
  { id: "stu-019", fullName: "Karim Naciri", phone: "0612345619", parentName: "Fadwa Naciri", parentPhone: "0661223319", registeredAt: "2026-09-20" },
  { id: "stu-020", fullName: "Asmaa Belfkih", phone: "0612345620", parentName: "Younes Belfkih", parentPhone: "0661223320", registeredAt: "2026-09-21" },
  { id: "stu-021", fullName: "Bilal Zeroual", phone: "0612345621", parentName: "Sanaa Zeroual", parentPhone: "0661223321", registeredAt: "2026-09-22" },
  { id: "stu-022", fullName: "Lina Cherkaoui", phone: "0612345622", parentName: "Adil Cherkaoui", parentPhone: "0661223322", registeredAt: "2026-09-23" },
  { id: "stu-023", fullName: "Adam Bouhaddou", phone: "0612345623", parentName: "Ilham Bouhaddou", parentPhone: "0661223323", registeredAt: "2026-09-24" },
  { id: "stu-024", fullName: "Rim El Mouden", phone: "0612345624", parentName: "Youssef El Mouden", parentPhone: "0661223324", registeredAt: "2026-09-25" },
  { id: "stu-025", fullName: "Elias Kabbaj", phone: "0612345625", parentName: "Naima Kabbaj", parentPhone: "0661223325", registeredAt: "2026-09-26" },
  { id: "stu-026", fullName: "Zineb Skalli", phone: "0612345626", parentName: "Rachida Skalli", parentPhone: "0661223326", registeredAt: "2026-09-27" },
  { id: "stu-027", fullName: "Amine Darwiche", phone: "0612345627", parentName: "Salah Darwiche", parentPhone: "0661223327", registeredAt: "2026-09-28" },
  { id: "stu-028", fullName: "Ghita Bennouna", phone: "0612345628", parentName: "Omar Bennouna", parentPhone: "0661223328", registeredAt: "2026-09-29" },
  { id: "stu-029", fullName: "Ilyas Hakimi", phone: "0612345629", parentName: "Salwa Hakimi", parentPhone: "0661223329", registeredAt: "2026-09-30" },
  { id: "stu-030", fullName: "Kenza Sbai", phone: "0612345630", parentName: "Khalil Sbai", parentPhone: "0661223330", registeredAt: "2026-10-01" },
];

type SeedEnrollment = {
  id: string;
  studentId: string;
  groupId: string;
  discount: string;
};

const primaryEnrollments: SeedEnrollment[] = students.map((student, index) => {
  let groupId: string;

  if (index < 5) groupId = "grp-maths-2bac-a";
  else if (index < 10) groupId = "grp-maths-2bac-b";
  else if (index < 14) groupId = "grp-maths-1bac-a";
  else if (index < 18) groupId = "grp-pc-2bac-a";
  else if (index < 21) groupId = "grp-pc-1bac-a";
  else if (index < 24) groupId = "grp-fr-b2-a";
  else if (index < 27) groupId = "grp-fr-b1-a";
  else groupId = "grp-en-a2-a";

  return {
    id: `enr-${student.id}-1`,
    studentId: student.id,
    groupId,
    discount: index < 3 ? "50.00" : "0.00",
  };
});

const secondaryEnrollments: SeedEnrollment[] = [
  ...students.slice(0, 5).map((student) => ({
    id: `enr-${student.id}-2`,
    studentId: student.id,
    groupId: "grp-pc-2bac-a",
    discount: "0.00",
  })),
  ...students.slice(5, 10).map((student) => ({
    id: `enr-${student.id}-2`,
    studentId: student.id,
    groupId: "grp-fr-b2-a",
    discount: "0.00",
  })),
  ...students.slice(10, 14).map((student) => ({
    id: `enr-${student.id}-2`,
    studentId: student.id,
    groupId: "grp-en-a2-a",
    discount: "0.00",
  })),
  {
    id: "enr-stu-015-2",
    studentId: "stu-015",
    groupId: "grp-maths-1bac-a",
    discount: "0.00",
  },
  {
    id: "enr-stu-019-2",
    studentId: "stu-019",
    groupId: "grp-fr-b1-a",
    discount: "100.00",
  },
  {
    id: "enr-stu-022-2",
    studentId: "stu-022",
    groupId: "grp-en-a2-a",
    discount: "0.00",
  },
];

async function main() {
  // Réinitialise uniquement les données de démonstration.
  await prisma.payment.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.session.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.group.deleteMany();
  await prisma.level.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();

  await prisma.subject.createMany({ data: subjects });
  await prisma.level.createMany({ data: levels });

  for (const group of groups) {
    await prisma.group.create({ data: group });
  }

  await prisma.schedule.createMany({ data: schedules });

  await prisma.student.createMany({
    data: students.map((student) => ({
      ...student,
      registeredAt: new Date(student.registeredAt),
    })),
  });

  await prisma.enrollment.createMany({
    data: [...primaryEnrollments, ...secondaryEnrollments].map((enrollment) => ({
      ...enrollment,
      startDate: new Date("2026-09-15"),
    })),
  });

  const passwordHash = await hash(adminPassword, 10);

  await prisma.user.create({
    data: {
      email: adminEmail.toLowerCase(),
      passwordHash,
    },
  });

  const [subjectCount, groupCount, studentCount, enrollmentCount] = await Promise.all([
    prisma.subject.count(),
    prisma.group.count(),
    prisma.student.count(),
    prisma.enrollment.count(),
  ]);

  // Seed des paiements de démonstration (septembre, octobre, novembre 2026)
  const allEnrollments = [...primaryEnrollments, ...secondaryEnrollments];
  const months = ["2026-09", "2026-10", "2026-11"];
  const groupFeeMap = new Map<string, number>();
  for (const group of groups) {
    groupFeeMap.set(group.id, Number(group.monthlyFee));
  }

  const paymentsToCreate: {
    enrollmentId: string;
    month: string;
    amountDue: number;
    amountPaid: number;
    status: "PAID" | "PARTIAL" | "UNPAID";
    paidAt: Date | null;
    note?: string;
  }[] = [];

  allEnrollments.forEach((enr, idx) => {
    const fee = groupFeeMap.get(enr.groupId) ?? 300;
    const discount = Number(enr.discount);
    const amountDue = Math.max(0, fee - discount);

    months.forEach((month, mIdx) => {
      const seedVal = (idx + mIdx * 7) % 10;
      let status: "PAID" | "PARTIAL" | "UNPAID";
      let amountPaid = 0;
      let paidAt: Date | null = null;
      let note: string | undefined = `Cotisation mensuelle ${month}`;

      if (month === "2026-09") {
        if (seedVal < 7) {
          status = "PAID";
          amountPaid = amountDue;
          paidAt = new Date("2026-09-05T10:00:00Z");
        } else if (seedVal < 9) {
          status = "PARTIAL";
          amountPaid = Math.round(amountDue / 2);
          paidAt = new Date("2026-09-12T14:30:00Z");
          note = "Acompte versé le 12/09";
        } else {
          status = "UNPAID";
          amountPaid = 0;
          paidAt = null;
        }
      } else if (month === "2026-10") {
        if (seedVal < 5) {
          status = "PAID";
          amountPaid = amountDue;
          paidAt = new Date("2026-10-04T11:00:00Z");
        } else if (seedVal < 7) {
          status = "PARTIAL";
          amountPaid = Math.round(amountDue / 2);
          paidAt = new Date("2026-10-10T16:00:00Z");
        } else {
          status = "UNPAID";
          amountPaid = 0;
          paidAt = null;
        }
      } else {
        if (seedVal < 3) {
          status = "PAID";
          amountPaid = amountDue;
          paidAt = new Date("2026-11-02T09:15:00Z");
        } else if (seedVal < 5) {
          status = "PARTIAL";
          amountPaid = Math.round(amountDue / 2);
          paidAt = new Date("2026-11-08T15:00:00Z");
        } else {
          status = "UNPAID";
          amountPaid = 0;
          paidAt = null;
        }
      }

      paymentsToCreate.push({
        enrollmentId: enr.id,
        month,
        amountDue,
        amountPaid,
        status,
        paidAt,
        note,
      });
    });
  });

  await prisma.payment.createMany({ data: paymentsToCreate });
  const paymentCount = await prisma.payment.count();

  console.log("Seed terminé :");
  console.log(`  Matières      : ${subjectCount}`);
  console.log(`  Groupes       : ${groupCount}`);
  console.log(`  Élèves        : ${studentCount}`);
  console.log(`  Inscriptions  : ${enrollmentCount}`);
  console.log(`  Paiements     : ${paymentCount}`);
  console.log(`  Admin         : ${adminEmail}`);
}

main()
  .catch((error) => {
    console.error("Échec du seed :", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
