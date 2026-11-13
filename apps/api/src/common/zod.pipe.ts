import { BadRequestException, type PipeTransform } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import { z } from 'zod';

export class ZodPipe<T> implements PipeTransform {
  constructor(private readonly schema: z.ZodType<T>) {}
  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success)
      throw new BadRequestException({
        message: 'Revise os campos informados',
        issues: result.error.issues.map(({ path, message }) => ({ path, message })),
      });
    return result.data;
  }
}

export const ApiZodBody = (schema: z.ZodType) =>
  ApiBody({
    schema: JSON.parse(JSON.stringify(z.toJSONSchema(schema, { unrepresentable: 'any' }))),
  });
