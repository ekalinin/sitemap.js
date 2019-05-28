import { $enum } from "ts-enum-util";

export const enum EnumChangefreq
{
	DAILY = 'daily',
	MONTHLY = 'monthly',
	ALWAYS = 'always',
	HOURLY = 'hourly',
	WEEKLY = 'weekly',
	YEARLY = 'yearly',
	NEVER = 'never',
}

export const CHANGEFREQ = [
	EnumChangefreq.ALWAYS,
	EnumChangefreq.HOURLY,
	EnumChangefreq.DAILY,
	EnumChangefreq.WEEKLY,
	EnumChangefreq.MONTHLY,
	EnumChangefreq.YEARLY,
	EnumChangefreq.NEVER
];

export const enum EnumYesNo
{
	YES = 'yes',
	NO = 'no',
}

export const enum EnumAllowDeny
{
	ALLOW = 'allow',
	DENY = 'deny',
}
