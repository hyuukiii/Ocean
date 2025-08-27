package com.example.ocean;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@MapperScan("com.example.ocean.mapper")  // repository 제거!
@EnableJpaRepositories(basePackages = "com.example.ocean.repository")  // JPA용 명시적 설정
@EntityScan(basePackages = "com.example.ocean.entity")  // Entity 스캔 명시
public class OceanApplication {
	public static void main(String[] args) {
		SpringApplication.run(OceanApplication.class, args);
	}
}
