const request = require('supertest');
const mongoose = require('mongoose');
const Category = require('../../../src/models/category');

describe('Category CRUD API', () => {
  let app;
  let server;
  let testCategory;

  beforeAll(async () => {
    app = global.__app;
    server = global.__server;
  });

  afterEach(async () => {
    // Clear the categories collection after each test
    if (mongoose.connection.readyState === 1) {
      await Category.deleteMany({});
    }
  });

  describe('POST /api/categories - Create Category', () => {
    it('should create a new category with valid data', async () => {
      const categoryData = {
        name: 'Test Category',
        description: 'Test category description'
      };

      const res = await request(app)
        .post('/api/categories')
        .send(categoryData)
        .expect(201);

      expect(res.body.name).toBe(categoryData.name);
      expect(res.body.description).toBe(categoryData.description);

      // Verify category was actually saved to database
      const savedCategory = await Category.findOne({ name: categoryData.name });
      expect(savedCategory).toBeTruthy();
      expect(savedCategory.description).toBe(categoryData.description);
    });

    it('should return 400 when name is missing', async () => {
      const invalidCategoryData = {
        description: 'Category without name'
      };

      const res = await request(app)
        .post('/api/categories')
        .send(invalidCategoryData)
        .expect(400);

      expect(res.body).toHaveProperty('message');
    });

    it('should return 400 when creating duplicate category name', async () => {
      const categoryData = {
        name: 'Duplicate Category',
        description: 'First category'
      };

      // Create first category
      await request(app)
        .post('/api/categories')
        .send(categoryData)
        .expect(201);

      // Try to create duplicate
      const res = await request(app)
        .post('/api/categories')
        .send(categoryData)
        .expect(400);

      expect(res.body).toHaveProperty('message');
    });
  });

  describe('GET /api/categories - Get Categories', () => {
    beforeEach(async () => {
      // Create test categories
      await Category.create([
        {
          name: 'Category 1',
          description: 'First test category'
        },
        {
          name: 'Category 2',
          description: 'Second test category'
        }
      ]);
    });

    it('should get all categories', async () => {
      const res = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0]).toHaveProperty('name');
      expect(res.body[0]).toHaveProperty('description');
      expect(res.body[1].name).toBe('Category 2');
    });
  });

  describe('PUT /api/categories/:id - Update Category', () => {
    beforeEach(async () => {
      // Create a category to update
      testCategory = await Category.create({
        name: 'Original Category',
        description: 'Original description'
      });
    });

    it('should update an existing category with valid data', async () => {
      const updateData = {
        name: 'Updated Category',
        description: 'Updated description'
      };

      const res = await request(app)
        .put(`/api/categories/${testCategory._id}`)
        .send(updateData)
        .expect(200);

      expect(res.body.name).toBe(updateData.name);
      expect(res.body.description).toBe(updateData.description);

      // Verify category was updated in database
      const updatedCategory = await Category.findById(testCategory._id);
      expect(updatedCategory.name).toBe(updateData.name);
    });

    it('should return 404 when updating non-existent category', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const updateData = {
        name: 'Updated Name',
        description: 'Updated description'
      };

      const res = await request(app)
        .put(`/api/categories/${fakeId}`)
        .send(updateData)
        .expect(404);

      expect(res.body).toHaveProperty('message', 'Category not found');
    });
  });

  describe('DELETE /api/categories/:id - Delete Category', () => {
    beforeEach(async () => {
      // Create a category to delete
      testCategory = await Category.create({
        name: 'Category to Delete',
        description: 'Will be deleted'
      });
    });

    it('should delete an existing category', async () => {
      const res = await request(app)
        .delete(`/api/categories/${testCategory._id}`)
        .expect(200);

      expect(res.body).toHaveProperty('message', 'Category deleted successfully');

      // Verify category was deleted from database
      const deletedCategory = await Category.findById(testCategory._id);
      expect(deletedCategory).toBeNull();
    });

    it('should return 404 when deleting non-existent category', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .delete(`/api/categories/${fakeId}`)
        .expect(404);

      expect(res.body).toHaveProperty('message', 'Category not found');
    });
  });
});