package com.nihongo.backend.progress;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface StudyDayRepository extends JpaRepository<StudyDay, StudyDay.Key> {

    @Query("select s from StudyDay s where s.id.userId = :userId order by s.id.day")
    List<StudyDay> findAllByUser(Long userId);
}
