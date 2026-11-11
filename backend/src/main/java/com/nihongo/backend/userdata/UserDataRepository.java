package com.nihongo.backend.userdata;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface UserDataRepository extends JpaRepository<UserData, UserData.Key> {

    @Query("select d from UserData d where d.id.userId = :userId")
    List<UserData> findAllByUser(Long userId);
}
