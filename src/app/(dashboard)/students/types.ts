export type StudentRow = {
  id: string;
  fullName: string;
  phone: string;
  isActive: boolean;
  registeredAt: string;
  groupLabels: string[];
};

export type GroupOption = {
  id: string;
  subjectName: string;
  levelName: string;
  groupName: string;
  monthlyFee: string;
  capacity: number;
  enrolled: number;
  isActive: boolean;
};

export type EnrollmentView = {
  id: string;
  groupId: string;
  subjectName: string;
  levelName: string;
  groupName: string;
  startDate: string;
  endDate: string | null;
  discount: string;
  monthlyFee: string;
  isActive: boolean;
  paymentsCount: number;
};
