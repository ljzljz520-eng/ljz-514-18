package com.cqu.service;

import com.cqu.model.FavoriteRoute;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;

import java.util.List;

/**
 * 收藏路线仓库：只操作 favorite_routes 表，绝不触碰 nodes/edges 等公共图数据。
 */
public class FavoriteRepository {
    private final EntityManagerFactory emf;

    public FavoriteRepository(EntityManagerFactory emf) {
        this.emf = emf;
    }

    public List<FavoriteRoute> findAll() {
        EntityManager em = emf.createEntityManager();
        try {
            return em.createQuery("select f from FavoriteRoute f order by f.createdAt desc", FavoriteRoute.class)
                    .getResultList();
        } finally {
            em.close();
        }
    }

    public FavoriteRoute save(FavoriteRoute favorite) {
        EntityManager em = emf.createEntityManager();
        try {
            em.getTransaction().begin();
            em.persist(favorite);
            em.getTransaction().commit();
            return favorite;
        } catch (RuntimeException e) {
            if (em.getTransaction().isActive()) {
                em.getTransaction().rollback();
            }
            throw e;
        } finally {
            em.close();
        }
    }

    public boolean deleteById(String id) {
        EntityManager em = emf.createEntityManager();
        try {
            em.getTransaction().begin();
            FavoriteRoute found = em.find(FavoriteRoute.class, id);
            if (found == null) {
                em.getTransaction().commit();
                return false;
            }
            em.remove(found);
            em.getTransaction().commit();
            return true;
        } catch (RuntimeException e) {
            if (em.getTransaction().isActive()) {
                em.getTransaction().rollback();
            }
            throw e;
        } finally {
            em.close();
        }
    }
}
