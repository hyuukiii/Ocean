package com.example.ocean.repository;

import com.example.ocean.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    // userId가 이제 PK이므로 findById 사용
    Optional<User> findByUserIdAndProvider(String userId, User.Provider provider);
    boolean existsByUserId(String userId);
}
