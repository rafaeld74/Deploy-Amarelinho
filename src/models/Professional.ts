import { knex } from '../database';
import { ICategory } from "./Category";

export interface ICreateProfessional {
  userId: number;
  phoneNumber: number;
  description: string;
  categories?: number[];
  notificationToken?: string;
}

export interface IProfessional {
  id: number;
  userId: number;
  name: string;
  email: string;
  password: string;
  isActive: boolean;
  phoneNumber: number;
  description: string;
  notificationToken?: string;
  categories?: ICategory[];
  created_at: Date;
  updated_at: Date;
}

export interface IUpdateProfessional {
  phoneNumber?: number;
  description?: string;
  categories?: number[];
}

class Professional {
  async create(professional: ICreateProfessional): Promise<IProfessional> {
    const now = new Date();
    const newProfessional = {
      ...professional,
      created_at: now,
      updated_at: now,
    }
    const [id] = await knex('professional').insert(newProfessional).returning('id');
    
    const associations = professional.categories?.map(categoryId => ({
      professional_id: id,
      category_id: categoryId,
    }));
    
    if (associations) {
      await knex('professionals_categories').insert(associations);
    }
    
    const [name, email, password, isActive] = await knex('users').where({ id: professional.userId }).select('name', 'email', 'password', 'isActive')
    
    const createdProfessional = { ...newProfessional, categories: professional.categories as unknown as ICategory[], id, name, email, password, isActive };

    return createdProfessional;
  }

  async getProfessionalWithCategories(professionalId: number): Promise<IProfessional> {
    const professional: IProfessional = await knex('professional')
      .join('users', 'users.id', 'professionals.userId')
      .where('id', professionalId)
      .select(
        'professional.id',
        'professional.phoneNumber',
        'professional.description',
        'professional.created_at',
        'professional.updated_at',
        'users.id as userId',
        'users.name',
        'users.email',
        'users.password',
        'users.isActive',
      )
      .first();

    const categories: ICategory[] = await knex('categories')
      .join('professionals_categories', 'categories.id', 'professionals_categories.category_id')
      .where('professionals_categories.professional_id', professionalId)
      .select('categories.*');

    return { ...professional, categories };
  }
 
 async findAll(): Promise<IProfessional[]> {
    return await knex('professional')
    .join('users', 'users.id', 'professional.userId')
    .select(
      'professional.id',
      'professional.phoneNumber',
      'professional.description',
      'professional.created_at',
      'professional.updated_at',
      'users.id as userId',
      'users.name',
      'users.email',
      'users.isActive',
    )
  }

  async findOne(id: number): Promise<IProfessional | undefined> {
    return knex('professional').where({ id })
    .join('users', 'users.id', 'professional.userId')
    .select(
      'professional.id',
      'professional.phoneNumber',
      'professional.description',
      'professional.created_at',
      'professional.updated_at',
      'users.id as userId',
      'users.name',
      'users.email',
      'users.isActive',
    ).first();
  }

  async update(id: number, professional: Partial<IUpdateProfessional>): Promise<boolean> {
    const updatedRows = await knex('professional').where({ id }).update(professional);
    if (updatedRows > 0) {
      await knex('professionals_categories')
        .where('professional_id', id)
        .del();

      const associations = professional.categories?.map(categoryId => ({
        professional_id: id,
        category_id: categoryId,
      }));

      await knex('professionals_categories').insert(associations);
      return true;
    }

    return false;
  }

  async delete(id: number): Promise<boolean> {
    const deletedRows = await knex('professional').where({ id }).del();
    if (deletedRows > 0) {
      await knex('professionals_categories')
        .where('professional_id', id)
        .del();
      return true;
    }
    return deletedRows > 0;
  }

  async findSortedByRating(): Promise<IProfessional[]> {
    const professionals = await knex<IProfessional>('professionals').select('*');
    const reviews = await knex('reviews').select('professional_id').avg('rating as average_rating').groupBy('professional_id');

    const professionalRatings = {};
    reviews.forEach(review => {
      professionalRatings[review.professional_id] = review.average_rating;
    });

    return professionals.sort((a, b) => {
      const ratingA = professionalRatings[a.id] || 0;
      const ratingB = professionalRatings[b.id] || 0;
      return ratingB - ratingA;
    });
  }
}

export default new Professional();