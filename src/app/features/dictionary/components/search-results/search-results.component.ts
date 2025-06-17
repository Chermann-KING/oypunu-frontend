import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { Word } from '../../../../core/models/word';
import { SearchResults } from '../../../../core/models/search-results';

@Component({
  selector: 'app-search-results',
  standalone: false,
  templateUrl: './search-results.component.html',
  styleUrls: ['./search-results.component.scss'],
})
export class SearchResultsComponent implements OnChanges {
  @Input() results: SearchResults | null = null;
  @Input() isLoading = false;
  @Input() query = '';
  @Input() currentPage = 1;

  @Output() pageChange = new EventEmitter<number>();
  @Output() favoriteToggle = new EventEmitter<Word>();

  totalPages = 0;
  paginationArray: number[] = [];

  constructor() {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['results'] && this.results) {
      this.totalPages = this.results.totalPages;
      this.buildPaginationArray();
    }
  }

  buildPaginationArray(): void {
    this.paginationArray = [];

    if (this.totalPages <= 7) {
      // Si moins de 7 pages, afficher toutes les pages
      for (let i = 1; i <= this.totalPages; i++) {
        this.paginationArray.push(i);
      }
    } else {
      // Sinon, afficher les premières, les dernières et celles autour de la page actuelle
      const firstPage = 1;
      const lastPage = this.totalPages;

      // Toujours afficher la première page
      this.paginationArray.push(firstPage);

      // Si la page actuelle est proche du début, afficher les premières pages
      if (this.currentPage <= 4) {
        for (let i = 2; i <= 5; i++) {
          this.paginationArray.push(i);
        }
        this.paginationArray.push(-1); // -1 représente "..."
        this.paginationArray.push(lastPage);
      }
      // Si la page actuelle est proche de la fin, afficher les dernières pages
      else if (this.currentPage >= this.totalPages - 3) {
        this.paginationArray.push(-1); // -1 représente "..."
        for (let i = this.totalPages - 4; i <= this.totalPages; i++) {
          this.paginationArray.push(i);
        }
      }
      // Sinon, afficher les pages autour de la page actuelle
      else {
        this.paginationArray.push(-1); // -1 représente "..."
        for (let i = this.currentPage - 1; i <= this.currentPage + 1; i++) {
          this.paginationArray.push(i);
        }
        this.paginationArray.push(-1); // -1 représente "..."
        this.paginationArray.push(lastPage);
      }
    }
  }

  onPageChange(page: number): void {
    if (page !== this.currentPage && page >= 1 && page <= this.totalPages) {
      this.pageChange.emit(page);
    }
  }

  onFavoriteToggle(word: Word): void {
    this.favoriteToggle.emit(word);
  }
}
